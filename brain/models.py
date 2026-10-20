"""
Simple Domain — Brain: Contrato de Entrada y Salida
Modelos de datos puros y desacoplados para el motor de análisis.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class NormalizedSeries:
    """Representa una secuencia de valores numéricos extraída de una columna o lista."""
    name: str
    values: List[float]
    raw_count: int
    excluded_count: int
    has_nulls: bool
    warnings: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class NormalizedDataset:
    """Entrada canónica e inmutable entregada a Brain para su análisis."""
    dataset_name: str
    format_type: str  # 'csv' | 'json'
    row_count: int
    column_names: List[str]
    column_types: Dict[str, str]  # 'numeric' | 'categorical' | 'boolean' | 'empty'
    numeric_series: List[NormalizedSeries]
    metadata: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


@dataclass
class SeriesStatistics:
    """Métricas estadísticas reales calculadas sobre una serie numérica."""
    count: int
    min_value: Optional[float]
    max_value: Optional[float]
    mean: Optional[float]
    std_dev: Optional[float]
    consecutive_diffs: List[float] = field(default_factory=list)


@dataclass
class PatternMatch:
    """Patrón numérico detectado con evidencia explícita."""
    series_name: str
    pattern_type: str  # 'constant' | 'arithmetic_progression' | 'irregular_variation' | 'insufficient_data'
    description: str
    parameters: Dict[str, Any]
    evidence: Dict[str, Any]
    statistics: SeriesStatistics
    warnings: List[str] = field(default_factory=list)


@dataclass
class BrainAnalysisResult:
    """Resultado estructurado completo producido por el motor Brain."""
    engine_version: str
    analysis_type: str
    dataset_name: str
    total_series_analyzed: int
    patterns: List[PatternMatch]
    summary: Dict[str, Any]
    global_warnings: List[str] = field(default_factory=list)
