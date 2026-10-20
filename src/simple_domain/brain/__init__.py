"""
Simple Domain — Módulo Brain
Motor independiente de análisis y detección de patrones numéricos.
"""

from simple_domain.brain.engine import BRAIN_ENGINE_VERSION, analyze_dataset
from simple_domain.brain.models import (
    BrainAnalysisResult,
    NormalizedDataset,
    NormalizedSeries,
    PatternMatch,
    SeriesStatistics,
)

__all__ = [
    "BRAIN_ENGINE_VERSION",
    "analyze_dataset",
    "NormalizedDataset",
    "NormalizedSeries",
    "PatternMatch",
    "SeriesStatistics",
    "BrainAnalysisResult",
]
