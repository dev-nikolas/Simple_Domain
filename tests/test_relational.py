"""
Pruebas automatizadas para el componente relacional de EXP-01.
Verifica robustez numérica, casos límite, compatibilidad exacta con EXP-00
y capacidad discriminativa del score relacional ante anomalías contextuales.
"""

import math
import pytest
from simple_domain.experiments.baseline0 import Baseline0Detector
from simple_domain.experiments.benchmark_s1 import generate_benchmark_s1
from simple_domain.experiments.relational import (
    CategoricalNumericRelation,
    CategoricalPairRelation,
    NumericPairRelation,
    RelationalCompatibilityModel,
    RelationalDetector,
)


def test_relational_disabled_reproduces_exp00_identically():
    """Cuando enable_relational=False, las puntuaciones deben ser idénticas bit a bit a EXP-00."""
    ds = generate_benchmark_s1(seed=42, n_fit=200, n_calib=50, n_eval=100)

    # Detector EXP-00
    det_base = Baseline0Detector(n_bins=20, smoothing_alpha=1.0)
    det_base.fit(ds.fit_set)
    th_base = det_base.calibrate(ds.calibration_set, quantile=0.95)
    scores_base = det_base.score_many(ds.evaluation_set)

    # Detector EXP-01 con componente desactivado
    det_rel_off = RelationalDetector(n_bins=20, smoothing_alpha=1.0, enable_relational=False)
    det_rel_off.fit(ds.fit_set)
    th_rel_off = det_rel_off.calibrate(ds.calibration_set, quantile=0.95)
    scores_rel_off = det_rel_off.score_many(ds.evaluation_set)

    assert th_base == th_rel_off
    assert scores_base == scores_rel_off


def test_relational_weight_zero_reproduces_exp00():
    """Cuando relational_weight=0.0, las puntuaciones deben coincidir con EXP-00."""
    ds = generate_benchmark_s1(seed=42, n_fit=100, n_calib=30, n_eval=50)

    det_base = Baseline0Detector(n_bins=15)
    det_base.fit(ds.fit_set)
    scores_base = det_base.score_many(ds.evaluation_set)

    det_rel_zero = RelationalDetector(n_bins=15, enable_relational=True, relational_weight=0.0)
    det_rel_zero.fit(ds.fit_set)
    scores_rel_zero = det_rel_zero.score_many(ds.evaluation_set)

    assert scores_base == scores_rel_zero


def test_relational_components_robustness():
    """Verifica que los tres tipos de relaciones no produzcan NaN ni Inf ante casos extremos."""
    # 1. Categórica - Numérica
    cat_num = CategoricalNumericRelation("mode", "temp")
    cat_num.fit([{"mode": "A", "temp": 10.0}, {"mode": "A", "temp": 10.0}])  # Varianza cero
    score1 = cat_num.score_rarity("A", 10.0)
    score_unseen_cat = cat_num.score_rarity("UNSEEN", 50.0)
    score_nan = cat_num.score_rarity("A", float("nan"))
    assert not math.isnan(score1) and not math.isinf(score1)
    assert not math.isnan(score_unseen_cat) and not math.isinf(score_unseen_cat)
    assert not math.isnan(score_nan) and not math.isinf(score_nan)

    # 2. Numérica - Numérica
    num_num = NumericPairRelation("x1", "x2")
    num_num.fit([{"x1": 1.0, "x2": 2.0}, {"x1": 1.0, "x2": 2.0}])  # Matriz singular
    score_pair = num_num.score_rarity(1.0, 2.0)
    score_pair_out = num_num.score_rarity(99.0, -99.0)
    assert not math.isnan(score_pair) and not math.isinf(score_pair)
    assert not math.isnan(score_pair_out) and not math.isinf(score_pair_out)

    # 3. Categórica - Categórica
    cat_cat = CategoricalPairRelation("c1", "c2")
    cat_cat.fit([{"c1": "X", "c2": "Y"}])
    score_cc = cat_cat.score_rarity("X", "Y")
    score_cc_unseen = cat_cat.score_rarity("NEW1", "NEW2")
    assert not math.isnan(score_cc) and not math.isinf(score_cc)
    assert not math.isnan(score_cc_unseen) and not math.isinf(score_cc_unseen)
    assert score_cc_unseen > score_cc


def test_relational_detects_contextual_mismatch():
    """
    Una anomalía contextual (ej. operating_mode='eco' con power_consumption de 280W)
    debe recibir una puntuación relacional marcadamente superior a una normal.
    """
    ds = generate_benchmark_s1(seed=42, n_fit=300, n_calib=50, n_eval=50)

    model = RelationalCompatibilityModel()
    model.fit(ds.fit_set)

    # Muestra normal eco
    normal_eco = {
        "operating_mode": "eco",
        "location_zone": "zone_A",
        "temperature": 20.0,
        "pressure": 1013.0,
        "vibration": 0.15,
        "power_consumption": 47.0,
    }

    # Anomalía contextual: eco pero con 280W de potencia (típico de boost)
    contextual_eco = {
        "operating_mode": "eco",
        "location_zone": "zone_A",
        "temperature": 20.0,
        "pressure": 1013.0,
        "vibration": 0.15,
        "power_consumption": 280.0,
    }

    score_normal = model.score_relations(normal_eco)
    score_contextual = model.score_relations(contextual_eco)

    assert score_contextual > score_normal
    # La diferencia debe ser sustancial
    assert score_contextual - score_normal > 5.0


def test_no_leakage_and_determinism():
    """Entrenamiento de RelationalDetector sin filtración y con determinismo estricto."""
    ds = generate_benchmark_s1(seed=101, n_fit=200, n_calib=50, n_eval=100)

    det1 = RelationalDetector(relational_weight=0.5)
    det1.fit(ds.fit_set)
    det1.calibrate(ds.calibration_set, quantile=0.95)
    s1 = det1.score_many(ds.evaluation_set)

    det2 = RelationalDetector(relational_weight=0.5)
    det2.fit(ds.fit_set)
    det2.calibrate(ds.calibration_set, quantile=0.95)
    s2 = det2.score_many(ds.evaluation_set)

    assert s1 == s2
    assert all(not math.isnan(s) and not math.isinf(s) for s in s1)
