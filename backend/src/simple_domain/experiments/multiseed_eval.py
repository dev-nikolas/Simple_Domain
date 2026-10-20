"""
Simple Domain — Evaluación Multi-Semilla de Baseline 0

Ejecuta el protocolo experimental sobre múltiples semillas pseudoaleatorias
para contrastar la estabilidad de Baseline 0 y comprobar que los resultados
no dependen de una fluctuación afortunada de una semilla específica.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any, Dict, List

from simple_domain.experiments.baseline0 import Baseline0Detector
from simple_domain.experiments.benchmark_s1 import generate_benchmark_s1
from simple_domain.experiments.metrics import (
    breakdown_by_scenario,
    compute_classification_metrics,
)


def run_multiseed_evaluation(
    seeds: List[int] = [42, 7, 101, 555, 2024],
    n_fit: int = 1000,
    n_calib: int = 300,
    n_eval: int = 1000,
    quantile: float = 0.95,
) -> Dict[str, Any]:
    """Evalúa Baseline 0 a lo largo de una lista de semillas y calcula estadísticas agregadas."""
    individual_results: List[Dict[str, Any]] = []

    roc_aucs: List[float] = []
    precisions: List[float] = []
    recalls: List[float] = []
    f1_scores: List[float] = []
    fprs: List[float] = []
    thresholds: List[float] = []

    scenario_rates: Dict[str, List[float]] = {
        "normal_known": [],
        "legit_variation": [],
        "novelty_regime": [],
        "point_anomaly": [],
        "contextual_anomaly": [],
        "incoherent_noise": [],
    }

    for seed in seeds:
        ds = generate_benchmark_s1(seed=seed, n_fit=n_fit, n_calib=n_calib, n_eval=n_eval)
        det = Baseline0Detector(n_bins=20, smoothing_alpha=1.0)
        det.fit(ds.fit_set)
        th = det.calibrate(ds.calibration_set, quantile=quantile)

        y_true = [obs.is_anomaly for obs in ds.evaluation_set]
        y_scores = det.score_many(ds.evaluation_set)
        y_pred = [s > th for s in y_scores]

        metrics = compute_classification_metrics(y_true, y_pred, y_scores)
        scen_breakdown = breakdown_by_scenario(ds.evaluation_set, y_pred, y_scores)

        thresholds.append(th)
        if metrics.roc_auc is not None:
            roc_aucs.append(metrics.roc_auc)
        precisions.append(metrics.precision)
        recalls.append(metrics.recall)
        f1_scores.append(metrics.f1_score)
        fprs.append(metrics.false_positive_rate)

        for sc_name in scenario_rates:
            if sc_name in scen_breakdown:
                scenario_rates[sc_name].append(scen_breakdown[sc_name]["alarm_rate"])

        individual_results.append({
            "seed": seed,
            "threshold": round(th, 4),
            "roc_auc": metrics.roc_auc,
            "precision": metrics.precision,
            "recall": metrics.recall,
            "f1_score": metrics.f1_score,
            "fpr": metrics.false_positive_rate,
            "scenario_alarm_rates": {k: v["alarm_rate"] for k, v in scen_breakdown.items()},
        })

    def mean_std(vals: List[float]) -> Dict[str, float]:
        if not vals:
            return {"mean": 0.0, "std": 0.0}
        m = sum(vals) / len(vals)
        variance = sum((x - m) ** 2 for x in vals) / (len(vals) - 1) if len(vals) > 1 else 0.0
        return {"mean": round(m, 4), "std": round(math.sqrt(variance), 4)}

    summary = {
        "seeds_evaluated": seeds,
        "n_seeds": len(seeds),
        "aggregated_metrics": {
            "roc_auc": mean_std(roc_aucs),
            "precision": mean_std(precisions),
            "recall": mean_std(recalls),
            "f1_score": mean_std(f1_scores),
            "false_positive_rate": mean_std(fprs),
            "threshold": mean_std(thresholds),
        },
        "aggregated_scenario_alarm_rates": {
            sc_name: mean_std(rates) for sc_name, rates in scenario_rates.items()
        },
        "individual_runs": individual_results,
    }

    return summary


def main():
    parser = argparse.ArgumentParser(description="Simple Domain — Validación Multi-Semilla Baseline 0")
    parser.add_argument("--seeds", type=int, nargs="+", default=[42, 7, 101, 555, 2024], help="Lista de semillas")
    parser.add_argument("--output", type=str, default="experiments/results/multiseed_baseline0_summary.json", help="Ruta salida")

    args = parser.parse_args()
    summary = run_multiseed_evaluation(seeds=args.seeds)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 65)
    print(f"RESULTADOS MULTI-SEMILLA BASELINE 0 ({summary['n_seeds']} semillas: {args.seeds})")
    print("=" * 65)
    agg = summary["aggregated_metrics"]
    print(f"ROC-AUC:   {agg['roc_auc']['mean']} ± {agg['roc_auc']['std']}")
    print(f"F1-Score:  {agg['f1_score']['mean']} ± {agg['f1_score']['std']}")
    print(f"Precision: {agg['precision']['mean']} ± {agg['precision']['std']}")
    print(f"Recall:    {agg['recall']['mean']} ± {agg['recall']['std']}")
    print(f"FPR:       {agg['false_positive_rate']['mean']} ± {agg['false_positive_rate']['std']}")
    print("-" * 65)
    print("Tasas de Alarma por Escenario (Media ± Desv. Típica):")
    for sc, data in summary["aggregated_scenario_alarm_rates"].items():
        print(f"  - {sc:<22}: {data['mean']*100:5.1f}% ± {data['std']*100:4.1f}%")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
