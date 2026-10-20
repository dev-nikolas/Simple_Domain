"""
Simple Domain — Brain: Motor de Análisis
Orquesta la ejecución de analizadores sobre datasets normalizados.
"""

from __future__ import annotations
from typing import List
from brain.analyzers.short_numeric import analyze_series
from brain.models import BrainAnalysisResult, NormalizedDataset, PatternMatch

BRAIN_ENGINE_VERSION = "0.1.0"


def analyze_dataset(dataset: NormalizedDataset) -> BrainAnalysisResult:
    """Ejecuta el pipeline de análisis numérico de Brain sobre un dataset normalizado."""
    patterns: List[PatternMatch] = []
    global_warnings = list(dataset.warnings)

    if not dataset.numeric_series:
        global_warnings.append("El conjunto de datos no contiene columnas o secuencias numéricas analizables.")

    for series in dataset.numeric_series:
        match = analyze_series(series)
        patterns.append(match)

    # Resumen cuantitativo honesto
    pattern_counts = {}
    for p in patterns:
        pattern_counts[p.pattern_type] = pattern_counts.get(p.pattern_type, 0) + 1

    summary = {
        "dataset_name": dataset.dataset_name,
        "format_type": dataset.format_type,
        "total_rows": dataset.row_count,
        "total_columns": len(dataset.column_names),
        "numeric_series_count": len(dataset.numeric_series),
        "pattern_distribution": pattern_counts,
        "has_warnings": bool(global_warnings or any(p.warnings for p in patterns)),
    }

    return BrainAnalysisResult(
        engine_version=BRAIN_ENGINE_VERSION,
        analysis_type="short_numeric_patterns",
        dataset_name=dataset.dataset_name,
        total_series_analyzed=len(patterns),
        patterns=patterns,
        summary=summary,
        global_warnings=global_warnings,
    )
