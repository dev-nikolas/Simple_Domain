"""
Simple Domain — Esquemas de Petición y Respuesta de la API HTTP (Pydantic v2)

Define los modelos de datos validados para la capa de servicio HTTP v0.1:
- HealthResponse: Diagnóstico del servicio y estado de disponibilidad del detector.
- InfoResponse: Metadatos no sensibles de versiones, capacidades y estado del modelo.
- ObservationRequest: Entrada validada para inferencia sin permitir filtración de etiquetas.
- ScoreResponse: Serialización explícita y tipada del resultado de inferencia.
- ErrorResponse: Estructura estándar para respuestas de error controladas.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    """Respuesta del endpoint GET /health."""
    status: str = Field(..., description="Estado general del servicio ('ok')")
    detector_ready: bool = Field(..., description="Indica si existe un modelo ajustado y calibrado listo para inferencia")
    message: str = Field(..., description="Descripción legible del estado de preparación del detector")


class InfoResponse(BaseModel):
    """Respuesta del endpoint GET /v1/info con información no sensible."""
    service_version: str = Field(..., description="Versión del servicio HTTP")
    package_version: str = Field(..., description="Versión del paquete simple_domain")
    schema_version: str = Field("v1", description="Versión del esquema de API")
    model_status: str = Field(
        ...,
        description="Estado del detector: 'unloaded', 'unfitted', 'uncalibrated' o 'ready'"
    )
    capabilities: List[str] = Field(
        default_factory=list,
        description="Lista de capacidades algorítmicas soportadas por el motor"
    )
    model_configuration: Optional[Dict[str, Any]] = Field(
        None,
        description="Configuración pública del modelo activo (sin datos privados de entrenamiento)"
    )


class ObservationRequest(BaseModel):
    """
    Petición para POST /v1/score conteniendo los atributos de la observación.
    No permite etiquetas de anomalía ni metadatos de evaluación.
    """
    features: Dict[str, Union[float, int, str, None]] = Field(
        ...,
        description="Diccionario de atributos (valores numéricos, categóricos o nulos)",
        max_length=100
    )

    @field_validator("features")
    @classmethod
    def validate_features_payload(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        if not v:
            raise ValueError("El diccionario 'features' no puede estar vacío.")

        # Prohibir explícitamente etiquetas de anomalía o supervisión
        forbidden_keys = {
            "is_anomaly", "anomaly", "label", "target", "ground_truth",
            "scenario", "obs_id", "y_true", "is_anom"
        }
        found_forbidden = [k for k in v.keys() if k.lower() in forbidden_keys]
        if found_forbidden:
            raise ValueError(
                f"No se permiten etiquetas de anomalía ni campos de evaluación en la inferencia: {found_forbidden}"
            )

        return v


class ScoreResponse(BaseModel):
    """Respuesta explícita de inferencia para POST /v1/score."""
    univariate_score: float = Field(..., description="Surprisal marginal promedio univariado")
    relational_score: float = Field(..., description="Incompatibilidad promedio relacional bivariada")
    combined_score: float = Field(..., description="Puntuación combinada final")
    threshold: Optional[float] = Field(None, description="Umbral de decisión calibrado aplicado")
    is_anomaly: Optional[bool] = Field(None, description="Decisión binaria (True si combined_score > threshold)")
    is_calibrated: bool = Field(..., description="Indica si la decisión se tomó con un umbral calibrado")
    model_version: Optional[str] = Field(None, description="Identificador de versión del modelo o paquete")


class ErrorResponse(BaseModel):
    """Estructura canónica de error."""
    detail: str = Field(..., description="Descripción del error")
    error_code: str = Field(..., description="Código de error tipificado para clientes")
