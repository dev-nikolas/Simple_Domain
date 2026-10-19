"""
Simple Domain — Adaptive Pattern System

API Principal del Sistema:
- SimpleDomainPipeline: Pipeline unificado de detección con soporte univariado y relacional.
- ScoreBreakdown: Estructura de resultados con desglose de puntuaciones univariadas y relacionales.
- AnomalyDetectionPipeline: Alias para SimpleDomainPipeline.
"""

from simple_domain.pipeline import (
    AnomalyDetectionPipeline,
    ScoreBreakdown,
    SimpleDomainPipeline,
)

__version__ = "0.1.0"

__all__ = [
    "SimpleDomainPipeline",
    "AnomalyDetectionPipeline",
    "ScoreBreakdown",
    "__version__",
]
