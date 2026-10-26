"""
Simple Domain — Esquemas Pydantic v2 para la API Modular v1.0
Modelos validados para Research, Data Sources, Patterns y Settings.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==================== Research (Experimentos) ====================
class ExperimentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    hypothesis: Optional[str] = Field(None, max_length=1000)
    status: str = Field("draft", pattern="^(draft|running|completed|archived)$")
    notes: Optional[str] = Field(None, max_length=2000)
    metadata: Optional[Dict[str, Any]] = None


class ExperimentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    hypothesis: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field(None, pattern="^(draft|running|completed|archived)$")
    notes: Optional[str] = Field(None, max_length=2000)
    metadata: Optional[Dict[str, Any]] = None


class ExperimentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    hypothesis: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==================== Data Sources (Fuentes) ====================
class DataSourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    format: str = Field(..., pattern="^(csv|json|xlsx)$")
    description: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=500)
    status: str = Field("registered", pattern="^(registered|available|unavailable|error)$")
    metadata: Optional[Dict[str, Any]] = None


class DataSourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    format: Optional[str] = Field(None, pattern="^(csv|json|xlsx)$")
    description: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None, pattern="^(registered|available|unavailable|error)$")
    metadata: Optional[Dict[str, Any]] = None


class DataSourceResponse(BaseModel):
    id: str
    name: str
    format: str
    description: Optional[str] = None
    location: Optional[str] = None
    status: str
    created_at: str
    updated_at: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==================== Patterns (Patrones) ====================
class PatternCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    pattern_type: str = Field(
        "custom",
        pattern="^(relational_bivariate|univariate_frequency|cluster|sequence|custom)$",
    )
    source_id: Optional[str] = None
    status: str = Field("registered", pattern="^(registered|active|archived)$")
    origin: str = Field("manual", pattern="^(manual|engine)$")
    metadata: Optional[Dict[str, Any]] = None


class PatternUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    pattern_type: Optional[str] = Field(
        None,
        pattern="^(relational_bivariate|univariate_frequency|cluster|sequence|custom)$",
    )
    source_id: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(registered|active|archived)$")
    metadata: Optional[Dict[str, Any]] = None


class PatternResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    pattern_type: str
    source_id: Optional[str] = None
    status: str
    origin: str
    created_at: str
    updated_at: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==================== Settings (Configuración) ====================
class SettingsUpdate(BaseModel):
    preferences: Optional[Dict[str, Any]] = None
    system_name: Optional[str] = None
    enable_relational_default: Optional[bool] = None
    default_quantile: Optional[float] = None
    telemetry_poll_interval_ms: Optional[int] = None
    auto_refresh_ui: Optional[bool] = None
    audit_strict_mode: Optional[bool] = None
    theme_contrast: Optional[str] = None
    active_mode: Optional[str] = None


class SettingsResponse(BaseModel):
    version: str
    updated_at: str
    preferences: Dict[str, Any]
