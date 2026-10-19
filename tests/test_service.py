"""
Pruebas automatizadas para la API HTTP local v0.1 de Simple Domain.
Verifica:
1. Endpoints GET /health y GET /v1/info (con y sin modelo).
2. Manejo de estados no listos en POST /v1/score (HTTP 503).
3. Inferencia correcta y desglose de puntuaciones en POST /v1/score (HTTP 200).
4. Validación estricta y rechazo de etiquetas de anomalía (HTTP 422).
5. Ausencia de mutación del modelo tras inferencias HTTP.
6. Middleware de límite de tamaño de payload (HTTP 413).
"""

import pytest
from fastapi.testclient import TestClient

from simple_domain.pipeline import SimpleDomainPipeline
from simple_domain.service.app import create_app


@pytest.fixture
def empty_app_client() -> TestClient:
    """Cliente para una aplicación sin detector configurado."""
    app = create_app(pipeline=None)
    return TestClient(app)


@pytest.fixture
def ready_app_client() -> TestClient:
    """Cliente para una aplicación con detector ajustado y calibrado."""
    pipeline = SimpleDomainPipeline(enable_relational=True, relational_weight=1.0)
    train_data = [
        {"mode": "A", "temp": 20.0, "power": 100.0},
        {"mode": "A", "temp": 21.0, "power": 105.0},
        {"mode": "B", "temp": 30.0, "power": 200.0},
        {"mode": "B", "temp": 31.0, "power": 205.0},
    ]
    calib_data = [
        {"mode": "A", "temp": 20.5, "power": 102.0},
        {"mode": "B", "temp": 30.5, "power": 202.0},
    ]
    pipeline.fit(train_data)
    pipeline.calibrate(calib_data, quantile=0.95)

    app = create_app(pipeline=pipeline)
    return TestClient(app)


def test_health_endpoint_when_unloaded(empty_app_client: TestClient):
    """GET /health cuando no hay modelo cargado."""
    resp = empty_app_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["detector_ready"] is False
    assert "no preparado" in data["message"].lower() or "unloaded" in data["message"].lower()


def test_health_endpoint_when_ready(ready_app_client: TestClient):
    """GET /health cuando el modelo está ajustado y calibrado."""
    resp = ready_app_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["detector_ready"] is True
    assert "calibrado" in data["message"].lower()


def test_info_endpoint_metadata(ready_app_client: TestClient):
    """GET /v1/info debe exponer metadatos públicos sin revelar rutas ni datos privados."""
    resp = ready_app_client.get("/v1/info")
    assert resp.status_code == 200
    data = resp.json()

    assert data["service_version"] == "0.1.0"
    assert data["package_version"] == "0.1.0"
    assert data["schema_version"] == "v1"
    assert data["model_status"] == "ready"
    assert "univariate_scoring" in data["capabilities"]
    assert "relational_compatibility" in data["capabilities"]

    cfg = data["model_configuration"]
    assert cfg is not None
    assert cfg["enable_relational"] is True
    assert cfg["relational_weight"] == 1.0
    assert "features_expected" in cfg


def test_score_endpoint_when_model_not_ready(empty_app_client: TestClient):
    """POST /v1/score debe retornar HTTP 503 si el modelo no está ajustado y calibrado."""
    payload = {"features": {"temp": 20.0, "power": 100.0}}
    resp = empty_app_client.post("/v1/score", json=payload)
    assert resp.status_code == 503
    assert "no está listo" in resp.json()["detail"].lower()


def test_score_endpoint_success_and_immutability(ready_app_client: TestClient):
    """POST /v1/score debe retornar puntuaciones desglosadas válidas y no mutar el modelo."""
    payload = {
        "features": {
            "mode": "A",
            "temp": 20.2,
            "power": 101.0,
        }
    }

    # Primera inferencia
    resp1 = ready_app_client.post("/v1/score", json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()

    assert "univariate_score" in data1
    assert "relational_score" in data1
    assert "combined_score" in data1
    assert "threshold" in data1
    assert "is_anomaly" in data1
    assert data1["is_calibrated"] is True
    assert isinstance(data1["is_anomaly"], bool)

    # Segunda inferencia idéntica
    resp2 = ready_app_client.post("/v1/score", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()

    # Comprobar idempotencia total
    assert data1 == data2


def test_score_endpoint_rejects_anomaly_labels(ready_app_client: TestClient):
    """POST /v1/score debe rechazar explícitamente etiquetas de anomalía."""
    payload = {
        "features": {
            "temp": 20.0,
            "power": 100.0,
            "is_anomaly": True,  # Campo prohibido
        }
    }
    resp = ready_app_client.post("/v1/score", json=payload)
    assert resp.status_code == 422
    assert "no se permiten etiquetas de anomalía" in resp.text.lower()


def test_score_endpoint_rejects_empty_features(ready_app_client: TestClient):
    """POST /v1/score debe rechazar features vacío."""
    payload = {"features": {}}
    resp = ready_app_client.post("/v1/score", json=payload)
    assert resp.status_code == 422


def test_payload_size_limit_middleware(ready_app_client: TestClient):
    """Peticiones que exceden el límite de tamaño deben recibir HTTP 413."""
    # Generar un body excesivamente grande (> 64 KB)
    huge_data = "x" * (70 * 1024)
    resp = ready_app_client.post(
        "/v1/score",
        content=huge_data,
        headers={"content-type": "application/json", "content-length": str(len(huge_data))},
    )
    assert resp.status_code == 413
