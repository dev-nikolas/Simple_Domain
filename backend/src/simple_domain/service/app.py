"""
Simple Domain — Aplicación FastAPI del Servicio HTTP Local v1.0
Endpoints: GET /health, GET /v1/info, POST /v1/score, /v1/{research, data-sources, patterns, settings, analysis, archive, conversations}.
"""

from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

import simple_domain
from simple_domain.pipeline import SimpleDomainPipeline
from simple_domain.service.modular_setup import setup_modular_services
from simple_domain.service.schemas import (
    ErrorResponse,
    HealthResponse,
    InfoResponse,
    ObservationRequest,
    ScoreResponse,
)

MAX_PAYLOAD_SIZE_BYTES = 64 * 1024  # 64 KB
MAX_ANALYSIS_PAYLOAD_BYTES = 4 * 1024 * 1024  # 4 MB
LOCAL_CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
]


class PayloadSizeLimitMiddleware(BaseHTTPMiddleware):
    """Rechaza peticiones cuyo tamaño exceda el límite establecido por ruta."""

    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl:
            try:
                is_up = request.url.path.startswith("/v1/analysis") or request.url.path.startswith("/v1/archive")
                lim = MAX_ANALYSIS_PAYLOAD_BYTES if is_up else MAX_PAYLOAD_SIZE_BYTES
                if int(cl) > lim:
                    code = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
                    msg = "Archivo excede límite de 4 MB" if is_up else "Payload excede 64 KB"
                    return JSONResponse(status_code=code, content={"detail": msg, "error_code": "PAYLOAD_TOO_LARGE"})
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


def create_app(
    pipeline: Optional[SimpleDomainPipeline] = None,
    storage_dir: Optional[str] = None,
) -> FastAPI:
    """Factoría para crear e inicializar la aplicación FastAPI con módulos."""
    app = FastAPI(
        title="Simple Domain Local HTTP Service",
        description="Capa de servicio HTTP local v1.0 modular con persistencia JSON y conexión RELIC.",
        version=simple_domain.__version__,
        docs_url="/docs",
        redoc_url=None,
    )
    app.state.pipeline = pipeline
    app.add_middleware(PayloadSizeLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=LOCAL_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    setup_modular_services(app, storage_dir=storage_dir)

    @app.get("/health", response_model=HealthResponse, summary="Diagnóstico de salud", tags=["Health"])
    def health_check() -> HealthResponse:
        current: Optional[SimpleDomainPipeline] = getattr(app.state, "pipeline", None)
        model_status = get_model_status(current)
        ready = (model_status == "ready")
        msg = (
            "Servicio activo y detector ajustado y calibrado para inferencia."
            if ready
            else f"Servicio activo. Detector no preparado para inferencia (estado: {model_status})."
        )
        return HealthResponse(status="ok", detector_ready=ready, message=msg)

    @app.get("/v1/info", response_model=InfoResponse, summary="Información del sistema", tags=["Metadata"])
    def system_info() -> InfoResponse:
        current: Optional[SimpleDomainPipeline] = getattr(app.state, "pipeline", None)
        model_status = get_model_status(current)
        capabilities = [
            "univariate_scoring",
            "relational_compatibility",
            "quantile_calibration",
            "score_breakdown",
            "modular_research",
            "modular_data_sources",
            "modular_patterns",
            "modular_settings",
            "brain_analysis",
            "relic_reasoning",
        ]

        model_config: Optional[Dict[str, Any]] = None
        if current is not None:
            cfg = current.get_config()
            model_config = {
                "enable_relational": cfg["enable_relational"],
                "relational_weight": cfg["relational_weight"],
                "n_bins": cfg["n_bins"],
                "smoothing_alpha": cfg["smoothing_alpha"],
                "threshold": cfg["threshold"],
                "calibrated_quantile": cfg["calibrated_quantile"],
                "features_expected": current.feature_schema,
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
        summary="Calcular puntuación de anomalía",
        tags=["Inference"],
    )
    def score_observation(req: ObservationRequest) -> ScoreResponse:
        current: Optional[SimpleDomainPipeline] = getattr(app.state, "pipeline", None)
        model_status = get_model_status(current)

        if current is None or model_status != "ready":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"El detector no está listo para inferencia (estado actual: '{model_status}'). Requiere ajuste y calibración previos.",
            )

        try:
            breakdown = current.score(req.features)
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