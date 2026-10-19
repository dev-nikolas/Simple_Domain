import io
import pytest
from fastapi.testclient import TestClient
from simple_domain.service.app import create_app


def test_analysis_api_csv_flow_and_persistence(tmp_path):
    app = create_app(storage_dir=str(tmp_path))
    client = TestClient(app)

    csv_data = b"time,temperature\n1,10.0\n2,20.0\n3,30.0\n4,40.0\n5,50.0\n"
    files = {"file": ("series.csv", io.BytesIO(csv_data), "text/csv")}

    res = client.post("/v1/analysis", files=files)
    assert res.status_code == 201
    ana = res.json()
    ana_id = ana["id"]
    assert ana["filename"] == "series.csv"
    assert ana["format"] == "csv"
    assert ana["status"] == "completed"

    patterns = ana["result"]["patterns"]
    assert len(patterns) >= 1
    temp_pat = next(p for p in patterns if p["series_name"] == "temperature")
    assert temp_pat["pattern_type"] == "arithmetic_progression"
    assert temp_pat["parameters"]["step"] == 10.0

    # Read back by ID
    get_res = client.get(f"/v1/analysis/{ana_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == ana_id

    # List all
    list_res = client.get("/v1/analysis")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Verify persistence survives app recreation
    app2 = create_app(storage_dir=str(tmp_path))
    client2 = TestClient(app2)
    reloaded_res = client2.get(f"/v1/analysis/{ana_id}")
    assert reloaded_res.status_code == 200
    assert reloaded_res.json()["filename"] == "series.csv"


def test_analysis_api_json_and_validations(tmp_path):
    app = create_app(storage_dir=str(tmp_path))
    client = TestClient(app)

    # JSON constant sequence
    json_data = b"[7, 7, 7, 7, 7]"
    files = {"file": ("const.json", io.BytesIO(json_data), "application/json")}
    res = client.post("/v1/analysis", files=files)
    assert res.status_code == 201
    assert res.json()["result"]["patterns"][0]["pattern_type"] == "constant"

    # Unsupported format rejection
    bad_files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    bad_res = client.post("/v1/analysis", files=bad_files)
    assert bad_res.status_code == 400
    assert "Formato no soportado" in bad_res.json()["detail"]

    # Empty file rejection
    empty_files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    empty_res = client.post("/v1/analysis", files=empty_files)
    assert empty_res.status_code == 400
