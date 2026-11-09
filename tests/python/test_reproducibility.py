"""
Prueba formal de reproducibilidad estricta para Simple Domain.
Verifica que dos corridas completas independientes con la misma semilla produzcan
exactamente los mismos datos, umbrales, puntuaciones y clasificaciones.
"""

from simple_domain.experiments.baseline0 import Baseline0Detector
from simple_domain.experiments.benchmark_s1 import generate_benchmark_s1
from simple_domain.experiments.metrics import compute_classification_metrics


def test_full_pipeline_reproducibility_seed_42():
    """Ejecuta dos pipelines completos e independientes y valida identidad bit a bit."""
    # Pipeline 1
    ds1 = generate_benchmark_s1(seed=42, n_fit=500, n_calib=150, n_eval=500)
    det1 = Baseline0Detector(n_bins=20, smoothing_alpha=1.0)
    det1.fit(ds1.fit_set)
    th1 = det1.calibrate(ds1.calibration_set, quantile=0.95)
    scores1 = det1.score_many(ds1.evaluation_set)
    preds1 = det1.predict_many(ds1.evaluation_set)
    y_true1 = [obs.is_anomaly for obs in ds1.evaluation_set]
    m1 = compute_classification_metrics(y_true1, preds1, scores1)

    # Pipeline 2
    ds2 = generate_benchmark_s1(seed=42, n_fit=500, n_calib=150, n_eval=500)
    det2 = Baseline0Detector(n_bins=20, smoothing_alpha=1.0)
    det2.fit(ds2.fit_set)
    th2 = det2.calibrate(ds2.calibration_set, quantile=0.95)
    scores2 = det2.score_many(ds2.evaluation_set)
    preds2 = det2.predict_many(ds2.evaluation_set)
    y_true2 = [obs.is_anomaly for obs in ds2.evaluation_set]
    m2 = compute_classification_metrics(y_true2, preds2, scores2)

    # 1. Identidad en umbral
    assert th1 == th2

    # 2. Identidad en puntuaciones y predicciones
    assert len(scores1) == len(scores2)
    assert scores1 == scores2
    assert preds1 == preds2

    # 3. Identidad en métricas
    assert m1.roc_auc == m2.roc_auc
    assert m1.precision == m2.precision
    assert m1.recall == m2.recall
    assert m1.f1_score == m2.f1_score
    assert m1.false_positive_rate == m2.false_positive_rate
