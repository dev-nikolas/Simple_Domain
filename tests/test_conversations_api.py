"""
Simple Domain — Pruebas de la API de Conversaciones (/v1/conversations)
"""

import pytest
from fastapi.testclient import TestClient
from simple_domain.service.app import create_app


@pytest.fixture
def client(tmp_path):
    storage_dir = tmp_path / "storage"
    storage_dir.mkdir()
    app = create_app(storage_dir=str(storage_dir))
    with TestClient(app) as c:
        yield c


def test_create_and_list_conversations(client):
    # 1. Crear conversación sin título (título provisional por defecto)
    resp = client.post("/v1/conversations", json={})
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Nuevo análisis"
    conv_id = data["id"]
    assert conv_id.startswith("conv_")

    # 2. Listar conversaciones
    list_resp = client.get("/v1/conversations")
    assert list_resp.status_code == 200
    convs = list_resp.json()
    assert len(convs) == 1
    assert convs[0]["id"] == conv_id

    # 3. Crear conversación con título explícito
    client.post("/v1/conversations", json={"title": "Auditoría de Sensores"})
    list_resp2 = client.get("/v1/conversations")
    assert len(list_resp2.json()) == 2
    assert list_resp2.json()[0]["title"] == "Auditoría de Sensores"


def test_messages_in_conversation(client):
    # Crear conversación
    c_resp = client.post("/v1/conversations", json={"title": "Chat de Pruebas"})
    conv_id = c_resp.json()["id"]

    # Agregar mensaje de usuario
    m1 = client.post(
        f"/v1/conversations/{conv_id}/messages",
        json={"role": "user", "content": "¿Puedes revisar el dataset de telemetría?"},
    )
    assert m1.status_code == 201
    m1_data = m1.json()
    assert m1_data["role"] == "user"
    assert m1_data["content"] == "¿Puedes revisar el dataset de telemetría?"

    # Agregar mensaje de asistente
    m2 = client.post(
        f"/v1/conversations/{conv_id}/messages",
        json={"role": "assistant", "content": "Listo para recibir el archivo."},
    )
    assert m2.status_code == 201

    # Consultar conversación completa
    get_resp = client.get(f"/v1/conversations/{conv_id}")
    assert get_resp.status_code == 200
    details = get_resp.json()
    assert len(details["messages"]) == 2
    assert details["messages"][0]["id"] == m1_data["id"]
    assert details["messages"][1]["role"] == "assistant"
