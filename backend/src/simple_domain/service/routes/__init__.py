"""
Simple Domain — Routers Modulares de la API HTTP v1.0
"""

from simple_domain.service.routes.research import router as research_router
from simple_domain.service.routes.data_sources import router as data_sources_router
from simple_domain.service.routes.patterns import router as patterns_router
from simple_domain.service.routes.settings import router as settings_router

__all__ = [
    "research_router",
    "data_sources_router",
    "patterns_router",
    "settings_router",
]
