"""
Simple Domain — Métricas de Evaluación Experimental

Métricas independientes de bibliotecas pesadas externas (cálculo analítico exacto):
- ROC-AUC: Cálculo exacto mediante estadístico de suma de rangos (Mann-Whitney U) con corrección de empates.
- Matriz de confusión, Precision, Recall, F1 y False Positive Rate (FPR).
- Desglose por escenario sintético.
- Perfilado de latencia (media y percentiles p50, p90, p99 en microsegundos).
- Estimación del consumo de memoria en RAM del modelo.
"""

from __future__ import annotations

import math
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class ClassificationMetrics:
    total_samples: int
    positives_true: int
    negatives_true: int
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    precision: float
    recall: float
    f1_score: float
    false_positive_rate: float
    roc_auc: Optional[float]


def compute_roc_auc(y_true: Sequence[bool], y_scores: Sequence[float]) -> Optional[float]:
    """
    Calcula el área bajo la curva ROC (ROC-AUC) mediante el estadístico U de Mann-Whitney.
    Maneja empates de puntuación calculando rangos promedio.
    Retorna None si solo hay una clase presente (todas positivas o todas negativas).
    """
    if len(y_true) != len(y_scores):
        raise ValueError("y_true e y_scores deben tener exactamente la misma longitud.")

    n = len(y_true)
    if n == 0:
        return None

    pos_count = sum(1 for y in y_true if y)
    neg_count = n - pos_count

    if pos_count == 0 or neg_count == 0:
        return None

    # Ordenar por puntuación ascendente
    indexed_scores = sorted(enumerate(y_scores), key=lambda x: x[1])

    # Asignar rangos (1-indexed) con rangos promedio para empates
    ranks = [0.0] * n
    i = 0
    while i < n:
        start = i
        curr_val = indexed_scores[i][1]
        while i < n and indexed_scores[i][1] == curr_val:
            i += 1
        end = i  # no inclusivo
        avg_rank = (start + 1 + end) / 2.0
        for k in range(start, end):
            orig_idx = indexed_scores[k][0]
            ranks[orig_idx] = avg_rank

    # Suma de rangos de los casos positivos
    sum_ranks_pos = sum(ranks[idx] for idx, y in enumerate(y_true) if y)

    # Estadístico U
    u_stat = sum_ranks_pos - (pos_count * (pos_count + 1.0)) / 2.0
    auc = u_stat / (pos_count * neg_count)
    return float(auc)


def compute_classification_metrics(
    y_true: Sequence[bool],
    y_pred: Sequence[bool],
    y_scores: Optional[Sequence[float]] = None,
) -> ClassificationMetrics:
    """Calcula la matriz de confusión, precision, recall, f1 y FPR."""
    if len(y_true) != len(y_pred):
        raise ValueError("y_true e y_pred deben tener la misma longitud.")

    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt and yp)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if not yt and yp)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if not yt and not yp)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt and not yp)

    pos_true = tp + fn
    neg_true = fp + tn

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2.0 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / neg_true if neg_true > 0 else 0.0

    auc = compute_roc_auc(y_true, y_scores) if y_scores is not None else None

    return ClassificationMetrics(
        total_samples=len(y_true),
        positives_true=pos_true,
        negatives_true=neg_true,
        true_positives=tp,
        false_positives=fp,
        true_negatives=tn,
        false_negatives=fn,
        precision=round(precision, 4),
        recall=round(recall, 4),
        f1_score=round(f1, 4),
        false_positive_rate=round(fpr, 4),
        roc_auc=round(auc, 4) if auc is not None else None,
    )


def breakdown_by_scenario(
    observations: Sequence[Any],
    y_pred: Sequence[bool],
    y_scores: Sequence[float],
) -> Dict[str, Dict[str, Any]]:
    """
    Desglosa el comportamiento del detector para cada escenario sintético específico.
    Permite contrastar la tasa de alarma en variaciones y novedades vs. anomalías reales.
    """
    scenarios: Dict[str, Dict[str, List[Any]]] = {}

    for obs, pred, score in zip(observations, y_pred, y_scores):
        scen = getattr(obs, "scenario", "unknown")
        is_anom = getattr(obs, "is_anomaly", False)
        if scen not in scenarios:
            scenarios[scen] = {"preds": [], "scores": [], "is_anom": []}
        scenarios[scen]["preds"].append(pred)
        scenarios[scen]["scores"].append(score)
        scenarios[scen]["is_anom"].append(is_anom)

    report: Dict[str, Dict[str, Any]] = {}
    for scen, data in scenarios.items():
        total = len(data["preds"])
        positive_preds = sum(1 for p in data["preds"] if p)
        scores_sorted = sorted(data["scores"])

        mean_score = sum(scores_sorted) / total if total > 0 else 0.0
        p50 = scores_sorted[int(0.50 * total)] if total > 0 else 0.0
        p90 = scores_sorted[min(total - 1, int(0.90 * total))] if total > 0 else 0.0

        is_true_anom_regime = any(data["is_anom"])

        report[scen] = {
            "total_samples": total,
            "ground_truth_is_anomaly": is_true_anom_regime,
            "alarm_count": positive_preds,
            "alarm_rate": round(positive_preds / total, 4) if total > 0 else 0.0,
            "mean_score": round(mean_score, 4),
            "p50_score": round(p50, 4),
            "p90_score": round(p90, 4),
        }

    return report


def benchmark_latency(detector: Any, observations: Sequence[Any], repeats: int = 1) -> Dict[str, float]:
    """
    Mide la latencia individual por observación de score_observation en microsegundos (µs).
    Retorna media, mediana (p50), percentiles p90, p99, mínimo y máximo.
    """
    latencies_us: List[float] = []

    # Calentamiento inicial con las primeras 5 observaciones
    warmup_samples = observations[: min(5, len(observations))]
    for obs in warmup_samples:
        detector.score_observation(obs)

    for _ in range(repeats):
        for obs in observations:
            t0 = time.perf_counter_ns()
            detector.score_observation(obs)
            t1 = time.perf_counter_ns()
            latencies_us.append((t1 - t0) / 1000.0)

    latencies_sorted = sorted(latencies_us)
    n = len(latencies_sorted)

    if n == 0:
        return {"mean_us": 0.0, "p50_us": 0.0, "p90_us": 0.0, "p99_us": 0.0, "min_us": 0.0, "max_us": 0.0}

    return {
        "mean_us": round(sum(latencies_sorted) / n, 2),
        "p50_us": round(latencies_sorted[int(0.50 * n)], 2),
        "p90_us": round(latencies_sorted[min(n - 1, int(0.90 * n))], 2),
        "p99_us": round(latencies_sorted[min(n - 1, int(0.99 * n))], 2),
        "min_us": round(latencies_sorted[0], 2),
        "max_us": round(latencies_sorted[-1], 2),
    }


def estimate_detector_memory_bytes(detector: Any) -> Dict[str, Any]:
    """
    Estima la huella de memoria en RAM de las estructuras de datos de Baseline 0.
    Metodología documentada:
    Suma recursiva de sys.getsizeof en los diccionarios de estimadores, tablas de
    probabilidad de bines, diccionarios de frecuencias y atributos escalares del objeto.
    """
    total_bytes = sys.getsizeof(detector)
    total_bytes += sys.getsizeof(detector.__dict__)

    num_est_bytes = 0
    for name, num_est in getattr(detector, "num_estimators", {}).items():
        est_bytes = sys.getsizeof(num_est) + sys.getsizeof(num_est.__dict__)
        est_bytes += sys.getsizeof(num_est.bin_probs)
        num_est_bytes += est_bytes

    cat_est_bytes = 0
    for name, cat_est in getattr(detector, "cat_estimators", {}).items():
        est_bytes = sys.getsizeof(cat_est) + sys.getsizeof(cat_est.__dict__)
        est_bytes += sys.getsizeof(cat_est.counts) + sys.getsizeof(cat_est.probs)
        cat_est_bytes += est_bytes

    total_bytes += num_est_bytes + cat_est_bytes

    return {
        "total_estimated_bytes": total_bytes,
        "numeric_estimators_bytes": num_est_bytes,
        "categorical_estimators_bytes": cat_est_bytes,
        "human_readable": f"{total_bytes / 1024.0:.2f} KB",
        "methodology": "sys.getsizeof recursivo sobre estructuras internas de estimadores y listas de bines",
    }
