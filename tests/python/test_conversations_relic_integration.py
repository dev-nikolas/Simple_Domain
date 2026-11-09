"""
Pruebas de integración del espacio de chat de Simple Domain conectado con el motor RELIC.
"""

import pytest
from fastapi.testclient import TestClient
from simple_domain.service.app import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app(storage_dir=str(tmp_path))
    return TestClient(app)


def test_conversations_chat_flow_with_relic_arithmetic(client):
    # 1. Crear una nueva conversación
    resp_conv = client.post("/v1/conversations", json={"title": "Sesión de Prueba RELIC"})
    assert resp_conv.status_code == 201
    conv = resp_conv.json()
    conv_id = conv["id"]
    assert conv["title"] == "Sesión de Prueba RELIC"

    # 2. Enviar mensaje de usuario con cálculo aritmético
    resp_msg = client.post(
        f"/v1/conversations/{conv_id}/messages",
        json={"role": "user", "content": "1 + 1"},
    )
    assert resp_msg.status_code == 201
    user_msg = resp_msg.json()
    assert user_msg["role"] == "user"
    assert user_msg["content"] == "1 + 1"

    # 3. Verificar que RELIC respondió automáticamente y se registró el mensaje del asistente
    resp_list = client.get(f"/v1/conversations/{conv_id}/messages")
    assert resp_list.status_code == 200
    messages = resp_list.json()
    assert len(messages) == 2

    assistant_msg = messages[1]
    assert assistant_msg["role"] == "assistant"
    assert "2" in assistant_msg["content"]
    assert assistant_msg["metadata"]["route"] in ("deterministic_arithmetic", "relic_cli_direct")


def test_conversations_chat_flow_with_relic_relational(client):
    # 1. Crear conversación
    resp_conv = client.post("/v1/conversations", json={"title": "Sesión Relacional"})
    conv_id = resp_conv.json()["id"]

    # 2. Enviar consulta relacional
    query = "Mateo es más alto que Lucas. Lucas es más alto que Tomás. ¿Quién es el más alto?"
    resp_msg = client.post(
        f"/v1/conversations/{conv_id}/messages",
        json={"role": "user", "content": query},
    )
    assert resp_msg.status_code == 201

    # 3. Verificar deducción de RELIC
    resp_list = client.get(f"/v1/conversations/{conv_id}/messages")
    messages = resp_list.json()
    assert len(messages) == 2
    assistant_msg = messages[1]
    assert "Mateo" in assistant_msg["content"]
