"""
Simple Domain — Aplicación FastAPI del Servicio HTTP Local v0.1

Implementa los endpoints:
- GET /health: Diagnóstico de servicio y preparación del modelo.
- GET /v1/info: Metadatos no sensibles de versión, capacidades y estado del detector.
- POST /v1/score: Inferencia de anomalías con validación y desglose de puntuaciones.

Seguridad:
- Diseñado para vincularse exclusivamente a localhost (127.0.0.1).
- Sin CORS permisivo abierto.
- Límite de tamaño de payload (64 KB).
- Sin registro de datos sensibles de entrada en logs.
"""

from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

import simple_domain
from simple_domain.pipeline import SimpleDomainPipeline
from simple_domain.service.schemas import (
    ErrorResponse,
    HealthResponse,
    InfoResponse,
    ObservationRequest,
    ScoreResponse,
)

MAX_PAYLOAD_SIZE_BYTES = 64 * 1024  # 64 KB


class PayloadSizeLimitMiddleware(BaseHTTPMiddleware):
    """Rechaza peticiones cuyo tamaño de cuerpo exceda el límite establecido."""

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_PAYLOAD_SIZE_BYTES:
                    status_code = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
                    return JSONResponse(
                        status_code=status_code,
                        content={"detail": "Payload demasiado grande (máximo 64 KB)", "error_code": "PAYLOAD_TOO_LARGE"},
                    )
            except ValueError:
                pass
        return await call_next(request)


def get_model_status(pipeline: Optional[SimpleDomainPipeline]) -> str:
    """Calcula el estado del modelo: 'unloaded', 'unfitted', 'uncalibrated' o 'ready'."""
    if pipeline is None:
        return "unloaded"
    if not pipeline.is_fitted:
        return "unfitted"
    if not pipeline.is_calibrated:
        return "uncalibrated"
    return "ready"


def create_app(pipeline: Optional[SimpleDomainPipeline] = None) -> FastAPI:
    """Factoría para crear e inicializar la aplicación FastAPI."""
    app = FastAPI(
        title="Simple Domain Local HTTP Service",
        description="Capa de servicio HTTP local v0.1 para inferencia y diagnóstico de Simple Domain.",
        version=simple_domain.__version__,
        docs_url="/docs",
        redoc_url=None,
    )

    # Inyectar pipeline en el estado de la aplicación
    app.state.pipeline = pipeline

    # Middleware de límite de tamaño
    app.add_middleware(PayloadSizeLimitMiddleware)

    @app.get(
        "/health",
        response_model=HealthResponse,
        summary="Diagnóstico de salud del servicio",
        tags=["Health"],
    )
    def health_check() -> HealthResponse:
        current_pipeline: Optional[SimpleDomainPipeline] = getattr(app.state, "pipeline", None)
        model_status = get_model_status(current_pipeline)
        ready = (model_status == "ready")

        if ready:
            msg = "Servicio activo y detector ajustado y calibrado para inferencia."
        else:
            msg = f"Servicio activo. Detector no preparado para inferencia (estado: {model_status})."

        return HealthResponse(
            status="ok",
            detector_ready=ready,
            message=msg,
        )

    @app.get(
        "/v1/info",
        response_model=InfoResponse,
        summary="Información no sensible del sistema y estado del detector",
        tags=["Metadata"],
    )
    def system_info() -> InfoResponse:
        current_pipeline: Optional[SimpleDomainPipeline] = getattr(app.state, "pipeline", None)
        model_status = get_model_status(current_pipeline)

        capabilities = [
            "univariate_scoring",
            "relational_compatibility",
            "quantile_calibration",
            "score_breakdown",
        ]

        model_config: Optional[Dict[str, Any]] = None
        if current_pipeline is not None:
            # Exponer solo configuración pública no sensible
            cfg = current_pipeline.get_config()
            model_config = {
                "enable_relational": cfg["enable_relational"],
                "relational_weight": cfg["relational_weight"],
                "n_bins": cfg["n_bins"],
                "smoothing_alpha": cfg["smoothing_alpha"],
                "threshold": cfg["threshold"],
                "calibrated_quantile": cfg["calibrated_quantile"],
                "features_expected": current_pipeline.feature_schema,
            }

        return InfoResponse(
            service_version="0.1.0",
            package_version=simple_domain.__version__,
            schema_version="v1",
            model_status=model_status,
            capabilities=capabilities,
            model_configuration=model_config,
        )

    @app.post(
        "/v1/score",
        response_model=ScoreResponse,
        responses={
            503: {"model": ErrorResponse, "description": "Detector no ajustado o calibrado"},
            422: {"description": "Entrada malformada o atributos no permitidos"},
        },
        summary="Calcular puntuación de anomalía para una observación",
        tags=["Inference"],
    )
    def score_observation(req: ObservationRequest) -> ScoreResponse:
        current_pipeline: Optional[SimpleDomainPipeline] = getattr(app.state, "pipeline", None)
        model_status = get_model_status(current_pipeline)

        if current_pipeline is None or model_status != "ready":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"El detector no está listo para inferencia (estado actual: '{model_status}'). Requiere ajuste y calibración previos.",
            )

        try:
            # Inferencia no mutante
            breakdown = current_pipeline.score(req.features)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error durante el cómputo de inferencia: {str(e)}",
            )

        return ScoreResponse(
            univariate_score=breakdown.univariate_score,
            relational_score=breakdown.relational_score,
            combined_score=breakdown.combined_score,
            threshold=breakdown.threshold,
            is_anomaly=breakdown.is_anomaly,
            is_calibrated=breakdown.is_calibrated,
            model_version=simple_domain.__version__,
        )

    return app
