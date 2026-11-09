import pytest
from fastapi.testclient import TestClient
from simple_domain.service.app import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app(storage_dir=str(tmp_path))
    return TestClient(app), tmp_path


def test_research_crud_and_persistence(tmp_path):
    app1 = create_app(storage_dir=str(tmp_path))
    client1 = TestClient(app1)

    # 1. List initially empty
    resp = client1.get("/v1/research/experiments")
    assert resp.status_code == 200
    assert resp.json() == []

    # 2. Create experiment
    payload = {
        "title": "Experimento 1",
        "description": "Prueba de aislamiento",
        "hypothesis": "Las anomalías univariadas bajan falso positivo",
        "status": "draft",
    }
    create_resp = client1.post("/v1/research/experiments", json=payload)
    assert create_resp.status_code == 201
    exp = create_resp.json()
    exp_id = exp["id"]
    assert exp["title"] == "Experimento 1"
    assert exp["status"] == "draft"

    # 3. Patch experiment
    patch_resp = client1.patch(f"/v1/research/experiments/{exp_id}", json={"status": "running"})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "running"

    # 4. Verify persistence across client/app re-instantiation
    app2 = create_app(storage_dir=str(tmp_path))
    client2 = TestClient(app2)
    get_resp = client2.get(f"/v1/research/experiments/{exp_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["status"] == "running"

    # 5. Delete experiment
    del_resp = client2.delete(f"/v1/research/experiments/{exp_id}")
    assert del_resp.status_code == 204
    assert client2.get(f"/v1/research/experiments/{exp_id}").status_code == 404


def test_data_sources_security_and_crud(tmp_path):
    app = create_app(storage_dir=str(tmp_path))
    client = TestClient(app)

    # Path traversal rejected
    bad_payload = {
        "name": "Intento Traversal",
        "format": "csv",
        "location": "../../../etc/passwd",
    }
    res = client.post("/v1/data-sources", json=bad_payload)
    assert res.status_code == 422 or res.status_code == 400

    # Valid data source
    valid_payload = {
        "name": "Dataset A",
        "format": "csv",
        "location": "datasets/alpha.csv",
        "description": "Muestras de red",
    }
    res = client.post("/v1/data-sources", json=valid_payload)
    assert res.status_code == 201
    ds = res.json()
    ds_id = ds["id"]
    assert ds["status"] == "registered"

    # Patch description
    patch_res = client.patch(f"/v1/data-sources/{ds_id}", json={"description": "Actualizado"})
    assert patch_res.status_code == 200
    assert patch_res.json()["description"] == "Actualizado"

    # Delete
    del_res = client.delete(f"/v1/data-sources/{ds_id}")
    assert del_res.status_code == 204
    assert client.get(f"/v1/data-sources/{ds_id}").status_code == 404
