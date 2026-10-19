"""
Pruebas automatizadas para el cálculo de métricas de evaluación.
Verifica cálculo analítico de ROC-AUC, métricas de clasificación, latencia y memoria.
"""

from simple_domain.experiments.baseline0 import Baseline0Detector
from simple_domain.experiments.benchmark_s1 import generate_benchmark_s1
from simple_domain.experiments.metrics import (
    benchmark_latency,
    compute_classification_metrics,
    compute_roc_auc,
    estimate_detector_memory_bytes,
)


def test_roc_auc_known_analytical_cases():
    """Verifica ROC-AUC con configuraciones con solución analítica exacta."""
    # 1. Separación perfecta -> AUC = 1.0
    y_true_perf = [False, False, True, True]
    y_scores_perf = [0.1, 0.2, 0.8, 0.9]
    assert compute_roc_auc(y_true_perf, y_scores_perf) == 1.0

    # 2. Separación completamente invertida -> AUC = 0.0
    y_scores_inv = [0.9, 0.8, 0.2, 0.1]
    assert compute_roc_auc(y_true_perf, y_scores_inv) == 0.0

    # 3. Empate total -> AUC = 0.5
    y_scores_ties = [0.5, 0.5, 0.5, 0.5]
    assert compute_roc_auc(y_true_perf, y_scores_ties) == 0.5

    # 4. Una sola clase presente -> retorna None
    assert compute_roc_auc([True, True], [0.1, 0.2]) is None
    assert compute_roc_auc([False, False], [0.1, 0.2]) is None


def test_classification_metrics_known_cases():
    """Verifica Precision, Recall, F1 y FPR con matriz de confusión conocida."""
    # 2 TP, 1 FP, 1 FN, 2 TN
    # TP=2, FP=1, FN=1, TN=2
    # Precision = 2 / 3 = 0.6667
    # Recall = 2 / 3 = 0.6667
    # F1 = 0.6667
    # FPR = 1 / 3 = 0.3333
    y_true = [True, True, True, False, False, False]
    y_pred = [True, True, False, True, False, False]

    m = compute_classification_metrics(y_true, y_pred)
    assert m.true_positives == 2
    assert m.false_positives == 1
    assert m.false_negatives == 1
    assert m.true_negatives == 2
    assert abs(m.precision - 0.6667) < 1e-3
    assert abs(m.recall - 0.6667) < 1e-3
    assert abs(m.f1_score - 0.6667) < 1e-3
    assert abs(m.false_positive_rate - 0.3333) < 1e-3


def test_classification_metrics_zero_division():
    """No debe producir ZeroDivisionError cuando no hay positivos predichos o verdaderos."""
    y_true = [False, False, False]
    y_pred = [False, False, False]

    m = compute_classification_metrics(y_true, y_pred)
    assert m.precision == 0.0
    assert m.recall == 0.0
    assert m.f1_score == 0.0
    assert m.false_positive_rate == 0.0


def test_latency_benchmark_and_percentiles_order():
    """Verifica que el perfil de latencia sea coherente y ordenado."""
    ds = generate_benchmark_s1(seed=42, n_fit=50, n_calib=10, n_eval=30)
    det = Baseline0Detector()
    det.fit(ds.fit_set)

    lat = benchmark_latency(det, ds.evaluation_set, repeats=1)
    assert lat["min_us"] >= 0.0
    assert lat["min_us"] <= lat["p50_us"] <= lat["p90_us"] <= lat["p99_us"] <= lat["max_us"]
    assert lat["mean_us"] > 0.0


def test_memory_estimation_structure():
    """Verifica que la estimación de memoria reporte bytes positivos y metodología documentada."""
    det = Baseline0Detector()
    det.fit([{"x": 1.0, "c": "A"}, {"x": 2.0, "c": "B"}])

    mem = estimate_detector_memory_bytes(det)
    assert mem["total_estimated_bytes"] > 0
    assert "sys.getsizeof" in mem["methodology"]
