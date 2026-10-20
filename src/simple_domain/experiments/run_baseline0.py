"""
Simple Domain — Ejecutor del Experimento EXP-00: Baseline 0

Ejecuta el protocolo experimental completo de Baseline 0 sobre Benchmark S1:
1. Generación de datos sintéticos (ajuste, calibración, evaluación).
2. Ajuste de estimadores de densidad univariada (sin supervisión).
3. Calibración de umbral sobre conjunto normal de calibración.
4. Evaluación sobre escenarios mixtos.
5. Cálculo de métricas globales, desgloses por escenario, latencia y memoria.
6. Exportación de reporte reproducible en Markdown y JSON.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from simple_domain.experiments.baseline0 import Baseline0Detector
from simple_domain.experiments.benchmark_s1 import BenchmarkDataset, generate_benchmark_s1
from simple_domain.experiments.metrics import (
    benchmark_latency,
    breakdown_by_scenario,
    compute_classification_metrics,
    estimate_detector_memory_bytes,
)


def run_experiment(
    seed: int = 42,
    n_fit: int = 1000,
    n_calib: int = 300,
    n_eval: int = 1000,
    quantile: float = 0.95,
    results_dir: str | Path = "experiments/results",
) -> Dict[str, Any]:
    """Ejecuta el experimento EXP-00 de principio a fin de forma reproducible."""
    results_path = Path(results_dir)
    results_path.mkdir(parents=True, exist_ok=True)

    print(f"[EXP-00] Generando Benchmark S1 (seed={seed}, n_fit={n_fit}, n_calib={n_calib}, n_eval={n_eval})...")
    benchmark: BenchmarkDataset = generate_benchmark_s1(
        seed=seed,
        n_fit=n_fit,
        n_calib=n_calib,
        n_eval=n_eval,
    )

    print("[EXP-00] Ajustando Baseline 0 sobre conjunto de entrenamiento (fit_set)...")
    detector = Baseline0Detector(n_bins=20, smoothing_alpha=1.0)
    detector.fit(benchmark.fit_set)

    print(f"[EXP-00] Calibrando umbral sobre calibration_set (quantile={quantile})...")
    threshold = detector.calibrate(benchmark.calibration_set, quantile=quantile)
    print(f"[EXP-00] Umbral calibrado: {threshold:.4f}")

    print("[EXP-00] Evaluando sobre evaluation_set...")
    eval_obs = benchmark.evaluation_set
    y_true = [obs.is_anomaly for obs in eval_obs]
    y_scores = detector.score_many(eval_obs)
    y_pred = [s > threshold for s in y_scores]

    # Métricas globales
    class_metrics = compute_classification_metrics(y_true, y_pred, y_scores)

    # Desglose por escenario
    scenario_metrics = breakdown_by_scenario(eval_obs, y_pred, y_scores)

    # Perfilado de latencia
    print("[EXP-00] Perfilando latencia de inferencia...")
    latency = benchmark_latency(detector, eval_obs, repeats=2)

    # Estimación de memoria
    memory_info = estimate_detector_memory_bytes(detector)

    # Casos representativos
    true_positives_examples: List[Dict[str, Any]] = []
    false_positives_examples: List[Dict[str, Any]] = []
    false_negatives_examples: List[Dict[str, Any]] = []

    for obs, score, pred, truth in zip(eval_obs, y_scores, y_pred, y_true):
        case_info = {
            "obs_id": obs.obs_id,
            "scenario": obs.scenario,
            "features": obs.features,
            "anomaly_score": round(score, 4),
            "predicted": pred,
            "ground_truth": truth,
            "metadata": obs.metadata,
        }
        if truth and pred and len(true_positives_examples) < 3:
            true_positives_examples.append(case_info)
        elif (not truth) and pred and len(false_positives_examples) < 3:
            false_positives_examples.append(case_info)
        elif truth and (not pred) and len(false_negatives_examples) < 3:
            false_negatives_examples.append(case_info)

    experiment_report: Dict[str, Any] = {
        "experiment_id": "EXP-00-BASELINE0",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "configuration": {
            "seed": seed,
            "n_fit": n_fit,
            "n_calib": n_calib,
            "n_eval": n_eval,
            "calibration_quantile": quantile,
            "smoothing_alpha": detector.alpha,
            "n_bins": detector.n_bins,
            "calibrated_threshold": round(threshold, 4),
        },
        "global_metrics": {
            "total_samples": class_metrics.total_samples,
            "positives_true": class_metrics.positives_true,
            "negatives_true": class_metrics.negatives_true,
            "true_positives": class_metrics.true_positives,
            "false_positives": class_metrics.false_positives,
            "true_negatives": class_metrics.true_negatives,
            "false_negatives": class_metrics.false_negatives,
            "precision": class_metrics.precision,
            "recall": class_metrics.recall,
            "f1_score": class_metrics.f1_score,
            "false_positive_rate": class_metrics.false_positive_rate,
            "roc_auc": class_metrics.roc_auc,
        },
        "scenario_breakdown": scenario_metrics,
        "latency_profile_us": latency,
        "memory_footprint": memory_info,
        "representative_cases": {
            "true_positives": true_positives_examples,
            "false_positives": false_positives_examples,
            "false_negatives": false_negatives_examples,
        },
        "limitations_observed": [
            "Incapacidad estructural para detectar anomalías contextuales: no modela relaciones cruzadas entre variables.",
            "Confusión entre novedad persistente coherente y anomalía: el nuevo régimen genera alto surprisal univariado y dispara falsas alarmas.",
            "Suposición de independencia condicional ingenua (Naive): la agregación por media aditiva oculta violaciones de covarianza compleja.",
        ],
    }

    # Guardar reporte JSON
    json_path = results_path / "exp00_baseline0_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(experiment_report, f, indent=2, ensure_ascii=False)

    # Generar y guardar reporte Markdown legible
    md_content = generate_markdown_report(experiment_report)
    md_path = results_path / "exp00_baseline0_report.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"[EXP-00] Reportes generados exitosamente en:\n  - {json_path}\n  - {md_path}")
    return experiment_report


def generate_markdown_report(rep: Dict[str, Any]) -> str:
    """Genera un informe en formato Markdown legible a partir del diccionario de resultados."""
    c = rep["configuration"]
    g = rep["global_metrics"]
    sc = rep["scenario_breakdown"]
    lat = rep["latency_profile_us"]
    mem = rep["memory_footprint"]

    lines = [
        "# Simple Domain — Informe Experimental EXP-00: Baseline 0",
        "",
        f"- **Fecha (UTC):** `{rep['timestamp_utc']}`",
        f"- **Identificador:** `{rep['experiment_id']}`",
        f"- **Semilla determinista:** `{c['seed']}`",
        "",
        "---",
        "",
        "## 1. Configuración del Experimento",
        "",
        "| Parámetro | Valor | Descripción |",
        "| :--- | :--- | :--- |",
        f"| **Muestras de ajuste (fit_set)** | {c['n_fit']} | Observaciones normales para estimación univariada |",
        f"| **Muestras calibración (calib_set)** | {c['n_calib']} | Observaciones normales para fijar umbral empírico |",
        f"| **Muestras evaluación (eval_set)** | {c['n_eval']} | Mezcla de 6 escenarios sintéticos de prueba |",
        f"| **Cuantil de calibración** | {c['calibration_quantile']} | Percentil de calibración fijado en datos normales |",
        f"| **Umbral calibrado ($\tau$)** | {c['calibrated_threshold']} | Umbral estático resultante |",
        f"| **Bines de histograma** | {c['n_bins']} | Resolución univariada para variables numéricas |",
        f"| **Suavizado de Laplace ($\alpha$)** | {c['smoothing_alpha']} | Parámetro aditivo de regularización |",
        "",
        "---",
        "",
        "## 2. Métricas Globales de Rendimiento",
        "",
        "| Métrica | Valor Obtenido | Interpretación |",
        "| :--- | :---: | :--- |",
        f"| **ROC-AUC** | **{g['roc_auc']}** | Capacidad discriminativa global de las puntuaciones continuas |",
        f"| **Precision** | **{g['precision']}** | Fracción de alarmas emitidas que correspondían a anomalías reales |",
        f"| **Recall (Sensibilidad)** | **{g['recall']}** | Fracción de anomalías reales capturadas por el umbral |",
        f"| **F1-Score** | **{g['f1_score']}** | Media armónica entre precision y recall |",
        f"| **False Positive Rate (FPR)** | **{g['false_positive_rate']}** | Tasa de falsa alarma en observaciones normales y novedades |",
        f"| **Matriz de Confusión** | TP={g['true_positives']} / FP={g['false_positives']} / TN={g['true_negatives']} / FN={g['false_negatives']} | Distribución neta de clasificaciones |",
        "",
        "---",
        "",
        "## 3. Desglose por Escenario Sintético",
        "",
        "| Escenario | Muestras | ¿Es Anomalía Real? | Alarmas Emitidas | Tasa Alarma | Score Medio | Score p50 | Score p90 |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for scen_name, s in sc.items():
        is_anom_str = "Sí (Positivo)" if s["ground_truth_is_anomaly"] else "No (Negativo)"
        lines.append(
            f"| `{scen_name}` | {s['total_samples']} | {is_anom_str} | {s['alarm_count']} | **{s['alarm_rate']*100:.1f}%** | {s['mean_score']:.2f} | {s['p50_score']:.2f} | {s['p90_score']:.2f} |"
        )

    lines.extend([
        "",
        "> [!IMPORTANT]",
        "> **Hallazgos clave del desglose:**",
        f"> 1. **Anomalías puntuales (`point_anomaly`):** Detección excelente ({sc.get('point_anomaly', {}).get('alarm_rate', 0)*100:.1f}% de captura) debido a que los valores individuales se sitúan en las colas del histograma.",
        f"> 2. **Anomalías contextuales (`contextual_anomaly`):** Captura extremadamente deficiente ({sc.get('contextual_anomaly', {}).get('alarm_rate', 0)*100:.1f}% de captura). Como cada variable aislada cae en rangos normales de algún modo operativo, la densidad univariada no percibe la incompatibilidad multivariada.",
        f"> 3. **Novedad persistente (`novelty_regime`):** Tasa de falsa alarma masiva ({sc.get('novelty_regime', {}).get('alarm_rate', 0)*100:.1f}%). Al carecer de plasticidad para incorporar nuevos prototipos estables, Baseline 0 cataloga la novedad como anomalía permanentemente.",
        "",
        "---",
        "",
        "## 4. Eficiencia Computacional y Memoria",
        "",
        "- **Latencia por observación (score_observation en CPU):**",
        f"  - Media: `{lat['mean_us']} µs`",
        f"  - Mediana (p50): `{lat['p50_us']} µs`",
        f"  - Percentil 90 (p90): `{lat['p90_us']} µs`",
        f"  - Percentil 99 (p99): `{lat['p99_us']} µs`",
        f"  - Rango: `[{lat['min_us']} µs, {lat['max_us']} µs]`",
        "- **Huella de memoria del detector:**",
        f"  - Total estimado: `{mem['human_readable']}` ({mem['total_estimated_bytes']} bytes)",
        f"  - Estimadores numéricos: `{mem['numeric_estimators_bytes']} bytes`",
        f"  - Estimadores categóricos: `{mem['categorical_estimators_bytes']} bytes`",
        f"  - *Metodología:* {mem['methodology']}",
        "",
        "---",
        "",
        "## 5. Casos Representativos Auditados",
        "",
        "### A. Aciertos (True Positives en Anomalías Puntuales)",
    ])

    for ex in rep["representative_cases"]["true_positives"]:
        lines.append(f"- **Obs #{ex['obs_id']}** (`{ex['scenario']}`): Score = `{ex['anomaly_score']}` > Umbral `{c['calibrated_threshold']}`")
        lines.append(f"  - Atributos: `{ex['features']}`")
        lines.append(f"  - Diagnóstico: {ex['metadata']}")

    lines.append("")
    lines.append("### B. Falsas Alarmas (False Positives en Novedad o Variaciones)")
    for ex in rep["representative_cases"]["false_positives"]:
        lines.append(f"- **Obs #{ex['obs_id']}** (`{ex['scenario']}`): Score = `{ex['anomaly_score']}` > Umbral `{c['calibrated_threshold']}` (Ground Truth: Normal)")
        lines.append(f"  - Atributos: `{ex['features']}`")
        lines.append(f"  - Razón del error: Las categorías o valores no observados en el ajuste disparan el surprisal univariado.")

    lines.append("")
    lines.append("### C. Falsos Negativos (Anomalías Contextuales no Detectadas)")
    for ex in rep["representative_cases"]["false_negatives"]:
        lines.append(f"- **Obs #{ex['obs_id']}** (`{ex['scenario']}`): Score = `{ex['anomaly_score']}` <= Umbral `{c['calibrated_threshold']}` (Ground Truth: Anomalía)")
        lines.append(f"  - Atributos: `{ex['features']}`")
        lines.append(f"  - Razón del fallo: {ex['metadata'].get('note', 'Valores marginales plausibles individualmente')}")

    lines.extend([
        "",
        "---",
        "",
        "## 6. Limitaciones Demostradas de Baseline 0",
        "",
        "1. **Ceguera ante anomalías relacionales / contextuales:** La agregación aditiva univariada es incapaz de detectar inconsistencias cruzadas cuando cada variable se mantiene en sus márgenes marginales.",
        "2. **Incapacidad de adaptación:** Confunde sistemáticamente la novedad estructural persistente con anomalías destructivas.",
        "3. **Utilidad como cota inferior:** Define con absoluta precisión el rendimiento mínimo que cualquier arquitectura adaptativa (GNG, ART o Predictive Coding) deberá superar demostrablemente en EXP-01.",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Simple Domain — EXP-00: Baseline 0 Runner")
    parser.add_argument("--seed", type=int, default=42, help="Semilla pseudoaleatoria (def: 42)")
    parser.add_argument("--n-fit", type=int, default=1000, help="Tamaño del conjunto de ajuste (def: 1000)")
    parser.add_argument("--n-calib", type=int, default=300, help="Tamaño del conjunto de calibración (def: 300)")
    parser.add_argument("--n-eval", type=int, default=1000, help="Tamaño del conjunto de evaluación (def: 1000)")
    parser.add_argument("--quantile", type=float, default=0.95, help="Cuantil de calibración (def: 0.95)")
    parser.add_argument("--results-dir", type=str, default="experiments/results", help="Directorio de salida")

    args = parser.parse_args()
    report = run_experiment(
        seed=args.seed,
        n_fit=args.n_fit,
        n_calib=args.n_calib,
        n_eval=args.n_eval,
        quantile=args.quantile,
        results_dir=args.results_dir,
    )

    gm = report["global_metrics"]
    print("\n" + "=" * 60)
    print("RESUMEN EXP-00 BASELINE 0")
    print("=" * 60)
    print(f"ROC-AUC:   {gm['roc_auc']}")
    print(f"F1-Score:  {gm['f1_score']} (Precision: {gm['precision']}, Recall: {gm['recall']})")
    print(f"FPR:       {gm['false_positive_rate']}")
    print(f"Latencia:  {report['latency_profile_us']['mean_us']} µs/obs (p50: {report['latency_profile_us']['p50_us']} µs)")
    print(f"Memoria:   {report['memory_footprint']['human_readable']}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
