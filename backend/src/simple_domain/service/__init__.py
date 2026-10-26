"""
Simple Domain — Servicio HTTP Local v0.1
Capa de servicio desacoplada para interacción HTTP.
"""

def create_app(*args, **kwargs):
    from simple_domain.service.app import create_app as _create_app
    return _create_app(*args, **kwargs)

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
