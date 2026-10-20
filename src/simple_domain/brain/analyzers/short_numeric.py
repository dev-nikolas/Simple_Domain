"""
Simple Domain — Brain: Analizador de Patrones Numéricos Cortos
Detecta secuencias constantes, progresiones aritméticas y variaciones irregulares.
"""

from __future__ import annotations
import math
from typing import List, Optional
from simple_domain.brain.models import NormalizedSeries, PatternMatch, SeriesStatistics

TOLERANCE = 1e-9
MIN_SERIES_LENGTH = 3


def compute_statistics(values: List[float], diffs: List[float]) -> SeriesStatistics:
    """Calcula estadísticas descriptivas exactas para la serie."""
    n = len(values)
    if n == 0:
        return SeriesStatistics(count=0, min_value=None, max_value=None, mean=None, std_dev=None)
    min_val = min(values)
    max_val = max(values)
    mean_val = sum(values) / n
    variance = sum((x - mean_val) ** 2 for x in values) / n if n > 0 else 0.0
    std_val = math.sqrt(variance)
    return SeriesStatistics(
        count=n,
        min_value=min_val,
        max_value=max_val,
        mean=round(mean_val, 6),
        std_dev=round(std_val, 6),
        consecutive_diffs=diffs[:20],  # Muestra representativa de diferencias
    )


def analyze_series(series: NormalizedSeries) -> PatternMatch:
    """Analiza una serie numérica normalizada buscando patrones estructurados."""
    values = series.values
    warnings: List[str] = list(series.warnings)

    if series.excluded_count > 0:
        warnings.append(
            f"Se excluyeron {series.excluded_count} valores no numéricos o ausentes de la columna '{series.name}'."
        )

    # 1. Caso: Insuficiente información
    if len(values) < MIN_SERIES_LENGTH:
        stats = compute_statistics(values, [])
        return PatternMatch(
            series_name=series.name,
            pattern_type="insufficient_data",
            description=f"Longitud de serie insuficiente ({len(values)} valores). Se requieren al menos {MIN_SERIES_LENGTH}.",
            parameters={"length": len(values), "required_minimum": MIN_SERIES_LENGTH},
            evidence={"provided_values": values},
            statistics=stats,
            warnings=warnings + ["Muestra demasiado reducida para emitir conclusiones de patrón."],
        )

    diffs = [round(values[i + 1] - values[i], 9) for i in range(len(values) - 1)]
    stats = compute_statistics(values, diffs)

    # 2. Caso: Secuencia Constante
    val_range = abs(max(values) - min(values))
    if val_range <= TOLERANCE:
        return PatternMatch(
            series_name=series.name,
            pattern_type="constant",
            description=f"Secuencia de valores constantes igual a {values[0]}.",
            parameters={"constant_value": values[0], "tolerance": TOLERANCE},
            evidence={"all_identical": True, "value_count": len(values)},
            statistics=stats,
            warnings=warnings,
        )

    # 3. Caso: Progresión Aritmética
    diff_spread = max(diffs) - min(diffs)
    if diff_spread <= TOLERANCE:
        step = diffs[0]
        direction = "ascendente" if step > 0 else "descendente"
        return PatternMatch(
            series_name=series.name,
            pattern_type="arithmetic_progression",
            description=f"Progresión aritmética {direction} con paso constante de {step:+g}.",
            parameters={"step": step, "first_value": values[0], "last_value": values[-1]},
            evidence={"constant_difference": step, "verified_transitions": len(diffs)},
            statistics=stats,
            warnings=warnings,
        )

    # 4. Caso: Secuencia con Variaciones Irregulares
    is_monotonic_inc = all(d > 0 for d in diffs)
    is_monotonic_dec = all(d < 0 for d in diffs)
    behavior = "monótona creciente" if is_monotonic_inc else ("monótona decreciente" if is_monotonic_dec else "no monótona")

    return PatternMatch(
        series_name=series.name,
        pattern_type="irregular_variation",
        description=f"Secuencia irregular ({behavior}); las diferencias no son constantes (rango: [{min(diffs):+g}, {max(diffs):+g}]).",
        parameters={"min_step": min(diffs), "max_step": max(diffs), "avg_step": round(sum(diffs) / len(diffs), 6)},
        evidence={"is_monotonic": is_monotonic_inc or is_monotonic_dec, "behavior": behavior},
        statistics=stats,
        warnings=warnings,
    )
