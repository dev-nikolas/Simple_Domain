"""
Simple Domain — Servicio HTTP Local v0.1
Capa de servicio desacoplada para interacción HTTP.
"""

from simple_domain.service.app import create_app
from simple_domain.service.schemas import (
    HealthResponse,
    InfoResponse,
    ObservationRequest,
    ScoreResponse,
)

__all__ = [
    "create_app",
    "HealthResponse",
    "InfoResponse",
    "ObservationRequest",
    "ScoreResponse",
]
