"""
Simple Domain — Pruebas de la API Archive, Procesamiento Asíncrono y E2E
"""

import asyncio
import io
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from simple_domain.service.app import create_app


@pytest.fixture
def test_setup(tmp_path):
    storage_dir = tmp_path / "storage"
    storage_dir.mkdir()
    app = create_app(storage_dir=str(storage_dir))
    with TestClient(app) as client:
        yield client, storage_dir


def test_archive_submit_and_async_processing(test_setup):
    client, storage_dir = test_setup

    # 1. Crear conversación
    c_resp = client.post("/v1/conversations", json={})
    conv_id = c_resp.json()["id"]

    # 2. Cargar fixture de 5 números: tests/fixtures/sample_numbers.json
    fixture_path = Path(__file__).parent / "fixtures" / "sample_numbers.json"
    assert fixture_path.exists(), "El fixture sample_numbers.json debe existir."
    file_bytes = fixture_path.read_bytes()
    expected_values = json.loads(file_bytes.decode("utf-8"))
    assert len(expected_values) == 5, "Debe contener exactamente cinco valores."

    # 3. Enviar archivo mediante POST /v1/archive/submit
    files = {"file": ("sample_numbers.json", io.BytesIO(file_bytes), "application/json")}
    data = {"conversation_id": conv_id}
    resp = client.post("/v1/archive/submit", files=files, data=data)

    assert resp.status_code == 202
    sub = resp.json()
    assert sub["status"] == "accepted"
    archive_id = sub["archive_id"]
    job_id = sub["job_id"]
    assert archive_id.startswith("arc_")
    assert job_id.startswith("job_")

    # 4. Esperar a que el coordinador asíncrono procese el archivo (máx 3s)
    import time
    completed = False
    for _ in range(30):
        time.sleep(0.1)
        m_resp = client.get(f"/v1/archive/{archive_id}")
        if m_resp.status_code == 200 and m_resp.json().get("status") == "completed":
            completed = True
            break
    assert completed, "El trabajo debe completar el procesamiento asíncrono."

    # 5. Comprobar que normalized.json contiene exactamente los 5 números entregados al motor
    norm_path = storage_dir / "archives" / archive_id / "normalized.json"
    assert norm_path.exists(), "Debe persistir storage/archives/{archive_id}/normalized.json"
    with open(norm_path, "r", encoding="utf-8") as f:
        norm_data = json.load(f)
    assert norm_data["row_count"] == 5
    assert norm_data["numeric_series"][0]["values"] == [float(x) for x in expected_values]

    # 6. Comprobar que result.json contiene el resultado real de Brain
    res_path = storage_dir / "archives" / archive_id / "result.json"
    assert res_path.exists(), "Debe persistir storage/archives/{archive_id}/result.json"
    with open(res_path, "r", encoding="utf-8") as f:
        result_data = json.load(f)
    pattern = result_data["patterns"][0]
    assert pattern["pattern_type"] == "irregular_variation"
    assert pattern["statistics"]["count"] == 5
    assert pattern["statistics"]["min_value"] == float(min(expected_values))
    assert pattern["statistics"]["max_value"] == float(max(expected_values))

    # 7. Comprobar que la conversación actualizó su título y recibió el mensaje del asistente
    conv_resp = client.get(f"/v1/conversations/{conv_id}")
    conv_data = conv_resp.json()
    assert conv_data["title"] == "Análisis · sample_numbers.json"
    assert len(conv_data["messages"]) == 2  # Mensaje de usuario + respuesta de asistente
    assistant_msg = conv_data["messages"][1]
    assert assistant_msg["role"] == "assistant"
    assert "sample_numbers.json" in assistant_msg["content"]
    assert "Variación irregular" in assistant_msg["content"]

    # 8. Comprobar persistencia tras recrear la app (simulación de reinicio)
    app2 = create_app(storage_dir=str(storage_dir))
    with TestClient(app2) as client2:
        m2 = client2.get(f"/v1/archive/{archive_id}")
        assert m2.status_code == 200
        assert m2.json()["status"] == "completed"
        c2 = client2.get(f"/v1/conversations/{conv_id}")
        assert c2.status_code == 200
        assert len(c2.json()["messages"]) == 2


def test_archive_validations_and_errors(test_setup):
    client, _ = test_setup

    # Archivo de formato no soportado (.pdf)
    files = {"file": ("data.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
    resp = client.post("/v1/archive/submit", files=files)
    assert resp.status_code == 400
    assert "Formato no soportado" in resp.json()["detail"]

    # Archivo vacío
    files_empty = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    resp_empty = client.post("/v1/archive/submit", files=files_empty)
    assert resp_empty.status_code == 400
    assert "vacío" in resp_empty.json()["detail"]
