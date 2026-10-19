"""
Pruebas automatizadas para Baseline0Detector.
Verifica robustez numérica, manejo de categorías no vistas, valores fuera de rango,
columnas constantes, determinismo y calibración de umbrales.
"""

import math
import pytest
from simple_domain.experiments.baseline0 import (
    Baseline0Detector,
    UnivariateCategoricalEstimator,
    UnivariateNumericEstimator,
)
from simple_domain.experiments.benchmark_s1 import generate_benchmark_s1


def test_numeric_estimator_robustness():
    """Prueba el estimador univariado numérico con casos extremos."""
    est = UnivariateNumericEstimator(n_bins=10, smoothing_alpha=1.0)
    est.fit([10.0, 10.0, 10.0])  # Variable constante

    assert est.is_constant is True
    # Valor visto
    score_seen = est.score_rarity(10.0)
    assert not math.isnan(score_seen) and not math.isinf(score_seen)
    assert score_seen >= 0.0

    # Valor fuera de rango
    score_unseen = est.score_rarity(999.0)
    assert score_unseen > score_seen
    assert not math.isnan(score_unseen) and not math.isinf(score_unseen)

    # Manejo de None y NaN
    score_none = est.score_rarity(None)
    score_nan = est.score_rarity(float("nan"))
    assert not math.isnan(score_none) and not math.isinf(score_none)
    assert not math.isnan(score_nan) and not math.isinf(score_nan)


def test_categorical_estimator_unseen_category():
    """Prueba el estimador categórico con categorías no vistas."""
    est = UnivariateCategoricalEstimator(smoothing_alpha=1.0)
    est.fit(["A", "A", "B"])

    score_a = est.score_rarity("A")
    score_b = est.score_rarity("B")
    score_unseen = est.score_rarity("CATEGORIA_NUNCA_VISTA")

    assert score_a < score_b < score_unseen
    assert not math.isnan(score_unseen) and not math.isinf(score_unseen)

    score_none = est.score_rarity(None)
    assert not math.isnan(score_none) and not math.isinf(score_none)


def test_baseline0_fit_and_predict_determinism():
    """Verifica que el detector produzca puntuaciones idénticas y finitas ante las mismas entradas."""
    ds = generate_benchmark_s1(seed=42, n_fit=100, n_calib=50, n_eval=50)

    det = Baseline0Detector(n_bins=15, smoothing_alpha=1.0)
    det.fit(ds.fit_set)
    det.calibrate(ds.calibration_set, quantile=0.90)

    scores1 = det.score_many(ds.evaluation_set)
    scores2 = det.score_many(ds.evaluation_set)

    assert scores1 == scores2
    for s in scores1:
        assert not math.isnan(s)
        assert not math.isinf(s)
        assert s >= 0.0

    preds1 = det.predict_many(ds.evaluation_set)
    preds2 = det.predict_many(ds.evaluation_set)
    assert preds1 == preds2


def test_baseline0_small_sample_and_constant_columns():
    """Ajuste con muestras pequeñas y columnas constantes sin lanzar excepción."""
    tiny_data = [
        {"temp": 20.0, "const_num": 5.0, "const_cat": "FIXED"},
        {"temp": 22.0, "const_num": 5.0, "const_cat": "FIXED"},
    ]
    det = Baseline0Detector(n_bins=5)
    det.fit(tiny_data)
    det.calibrate(tiny_data, quantile=0.50)

    # Evaluar con fila normal y fila con anomalía extrema
    score_norm = det.score_observation({"temp": 21.0, "const_num": 5.0, "const_cat": "FIXED"})
    score_anom = det.score_observation({"temp": 120.0, "const_num": 500.0, "const_cat": "NEW_CAT"})

    assert not math.isnan(score_norm)
    assert not math.isnan(score_anom)
    assert score_anom > score_norm


def test_baseline0_detects_obvious_point_anomalies():
    """Anomalías puntuales masivas deben recibir puntuaciones sustancialmente más altas que las normales."""
    ds = generate_benchmark_s1(seed=42, n_fit=200, n_calib=50, n_eval=100)
    det = Baseline0Detector()
    det.fit(ds.fit_set)
    det.calibrate(ds.calibration_set, quantile=0.95)

    normal_scores = [det.score_observation(obs) for obs in ds.evaluation_set if obs.scenario == "normal_known"]
    point_scores = [det.score_observation(obs) for obs in ds.evaluation_set if obs.scenario == "point_anomaly"]

    avg_normal = sum(normal_scores) / len(normal_scores)
    avg_point = sum(point_scores) / len(point_scores)

    # Las anomalías puntuales deben ser claramente más raras en promedio
    assert avg_point > avg_normal
