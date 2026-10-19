"""
Pruebas de integración para SimpleDomainPipeline (API Principal).
Verifica:
1. Flujo completo: fit -> calibrate -> score -> predict.
2. Equivalencia exacta con EXP-00 con enable_relational=False.
3. Equivalencia exacta con EXP-01 con enable_relational=True.
4. Idempotencia de inferencia (el estado interno no cambia al predecir).
5. Errores explícitos ante estados no ajustados o no calibrados.
6. Manejo robusto de NaN, None, categorías no vistas y columnas constantes.
7. Serialización de configuración del pipeline.
"""

import math
import pytest
from simple_domain import ScoreBreakdown, SimpleDomainPipeline
from simple_domain.experiments.baseline0 import Baseline0Detector
from simple_domain.experiments.benchmark_s1 import generate_benchmark_s1
from simple_domain.experiments.relational import RelationalDetector


def test_full_pipeline_flow():
    """Prueba el ciclo de vida completo del pipeline sobre datos de entrada estándar."""
    train_data = [
        {"mode": "A", "temp": 20.0, "power": 100.0},
        {"mode": "A", "temp": 20.5, "power": 102.0},
        {"mode": "A", "temp": 21.0, "power": 105.0},
        {"mode": "A", "temp": 21.5, "power": 107.0},
        {"mode": "B", "temp": 30.0, "power": 200.0},
        {"mode": "B", "temp": 30.5, "power": 202.0},
        {"mode": "B", "temp": 31.0, "power": 205.0},
        {"mode": "B", "temp": 31.5, "power": 207.0},
    ]
    calib_data = [
        {"mode": "A", "temp": 20.2, "power": 101.0},
        {"mode": "A", "temp": 20.8, "power": 104.0},
        {"mode": "A", "temp": 21.2, "power": 106.0},
        {"mode": "B", "temp": 30.2, "power": 201.0},
        {"mode": "B", "temp": 30.8, "power": 204.0},
        {"mode": "B", "temp": 31.2, "power": 206.0},
    ]

    pipeline = SimpleDomainPipeline(enable_relational=True, relational_weight=1.0)
    assert not pipeline.is_fitted
    assert not pipeline.is_calibrated

    # 1. Ajuste
    pipeline.fit(train_data)
    assert pipeline.is_fitted
    assert not pipeline.is_calibrated

    # 2. Calibración (al 99% para tolerar variaciones leves en datos normales)
    th = pipeline.calibrate(calib_data, quantile=0.99)
    assert pipeline.is_calibrated
    assert pipeline.threshold == th

    # 3. Puntuación de observación normal
    normal_obs = {"mode": "A", "temp": 20.5, "power": 102.0}
    res_normal = pipeline.score(normal_obs)
    assert isinstance(res_normal, ScoreBreakdown)
    assert not math.isnan(res_normal.combined_score)
    assert res_normal.is_calibrated is True

    # 4. Puntuación de anomalía evidente
    anom_obs = {"mode": "A", "temp": 99.0, "power": 999.0}
    res_anom = pipeline.score(anom_obs)
    assert res_anom.combined_score > res_normal.combined_score
    assert pipeline.predict(anom_obs) is True


def test_pipeline_equivalence_with_exp00_when_disabled():
    """El pipeline con enable_relational=False debe coincidir bit a bit con EXP-00 (Baseline0Detector)."""
    ds = generate_benchmark_s1(seed=42, n_fit=200, n_calib=50, n_eval=100)

    # 1. EXP-00 original
    base_det = Baseline0Detector(n_bins=20, smoothing_alpha=1.0)
    base_det.fit(ds.fit_set)
    th_base = base_det.calibrate(ds.calibration_set, quantile=0.95)
    scores_base = base_det.score_many(ds.evaluation_set)
    preds_base = [s > th_base for s in scores_base]

    # 2. SimpleDomainPipeline univariado
    pipeline = SimpleDomainPipeline(n_bins=20, smoothing_alpha=1.0, enable_relational=False)
    pipeline.fit(ds.fit_set)
    th_pipe = pipeline.calibrate(ds.calibration_set, quantile=0.95)
    results_pipe = pipeline.score_many(ds.evaluation_set)
    scores_pipe = [r.combined_score for r in results_pipe]
    preds_pipe = pipeline.predict_many(ds.evaluation_set)

    # Comparación exacta
    assert th_base == th_pipe
    assert len(scores_base) == len(scores_pipe)
    for sb, sp in zip(scores_base, scores_pipe):
        assert abs(sb - sp) < 1e-5
    assert preds_base == preds_pipe


def test_pipeline_equivalence_with_exp01_when_enabled():
    """El pipeline con enable_relational=True debe coincidir exactamente con RelationalDetector de EXP-01."""
    ds = generate_benchmark_s1(seed=101, n_fit=200, n_calib=50, n_eval=100)

    # 1. RelationalDetector de EXP-01
    rel_det = RelationalDetector(n_bins=20, smoothing_alpha=1.0, enable_relational=True, relational_weight=1.0)
    rel_det.fit(ds.fit_set)
    th_rel = rel_det.calibrate(ds.calibration_set, quantile=0.95)
    scores_rel = rel_det.score_many(ds.evaluation_set)

    # 2. SimpleDomainPipeline integrado
    pipeline = SimpleDomainPipeline(n_bins=20, smoothing_alpha=1.0, enable_relational=True, relational_weight=1.0)
    pipeline.fit(ds.fit_set)
    th_pipe = pipeline.calibrate(ds.calibration_set, quantile=0.95)
    results_pipe = pipeline.score_many(ds.evaluation_set)
    scores_pipe = [r.combined_score for r in results_pipe]

    assert th_rel == th_pipe
    assert len(scores_rel) == len(scores_pipe)
    for sr, sp in zip(scores_rel, scores_pipe):
        assert abs(sr - sp) < 1e-5


def test_inference_idempotence_and_immutability():
    """
    Verifica que calcular puntuaciones no modifique el estado del pipeline.
    Llamar a score() múltiples veces debe retornar valores idénticos y la configuración no debe mutar.
    """
    train_data = [{"x": 1.0, "y": 2.0}, {"x": 2.0, "y": 4.0}, {"x": 3.0, "y": 6.0}]
    pipeline = SimpleDomainPipeline()
    pipeline.fit(train_data)
    pipeline.calibrate(train_data, quantile=0.80)

    config_before = pipeline.get_config()

    test_sample = {"x": 2.5, "y": 5.0}
    scores = [pipeline.score(test_sample) for _ in range(5)]

    # Todas las evaluaciones deben ser idénticas
    assert len(set(s.combined_score for s in scores)) == 1
    assert len(set(s.univariate_score for s in scores)) == 1
    assert len(set(s.relational_score for s in scores)) == 1

    # La configuración no debe haber cambiado
    config_after = pipeline.get_config()
    assert config_before == config_after


def test_explicit_errors_on_unfitted_or_uncalibrated_access():
    """El pipeline debe lanzar excepciones claras si se intenta predecir o puntuar en un estado no válido."""
    pipeline = SimpleDomainPipeline()

    # 1. Score antes de fit -> RuntimeError explícito
    with pytest.raises(RuntimeError, match="debe ser ajustado mediante fit"):
        pipeline.score({"a": 1.0})

    # 2. Calibrate antes de fit -> RuntimeError explícito
    with pytest.raises(RuntimeError, match="debe ser ajustado mediante fit"):
        pipeline.calibrate([{"a": 1.0}])

    pipeline.fit([{"a": 1.0}, {"a": 2.0}])

    # 3. Predict antes de calibrate -> RuntimeError explícito
    with pytest.raises(RuntimeError, match="requiere calibración previa"):
        pipeline.predict({"a": 1.5})

    # 4. Entrada inválida (no diccionario) -> TypeError explícito
    with pytest.raises(TypeError, match="debe ser un diccionario"):
        pipeline.score("no_es_un_diccionario")


def test_handling_missing_constant_and_unseen_values():
    """Verifica que NaN, None, constantes y categorías no vistas no causen excepciones ni valores infinitos."""
    train_data = [
        {"mode": "X", "const_col": 5.0, "val": 10.0},
        {"mode": "X", "const_col": 5.0, "val": 20.0},
    ]
    pipeline = SimpleDomainPipeline()
    pipeline.fit(train_data)
    pipeline.calibrate(train_data, quantile=0.50)

    # Observación con None, NaN, categoría desconocida y valor numérico fuera de rango
    stress_obs = {
        "mode": "CATEGORIA_DESCONOCIDA",
        "const_col": None,
        "val": float("nan"),
        "extra_field": 999.0,
    }

    res = pipeline.score(stress_obs)
    assert not math.isnan(res.univariate_score)
    assert not math.isnan(res.relational_score)
    assert not math.isnan(res.combined_score)
    assert not math.isinf(res.combined_score)
    assert res.combined_score > 0.0


def test_serialization_and_configuration():
    """Verifica get_config() y to_dict() del pipeline y de ScoreBreakdown."""
    pipeline = SimpleDomainPipeline(enable_relational=True, relational_weight=0.75, n_bins=15)
    cfg = pipeline.get_config()

    assert cfg["enable_relational"] is True
    assert cfg["relational_weight"] == 0.75
    assert cfg["n_bins"] == 15
    assert cfg["is_fitted"] is False
    assert cfg["is_calibrated"] is False
    assert pipeline.to_dict() == cfg
