import pytest
from fastapi.testclient import TestClient
from simple_domain.service.app import create_app


def test_patterns_and_source_validation(tmp_path):
    app = create_app(storage_dir=str(tmp_path))
    client = TestClient(app)

    # 1. Invalid source_id should be rejected
    bad_pattern = {
        "name": "Patrón con fuente inexistente",
        "pattern_type": "relational_bivariate",
        "source_id": "nonexistent-id",
    }
    resp = client.post("/v1/patterns", json=bad_pattern)
    assert resp.status_code == 400

    # 2. Register valid data source first
    ds_resp = client.post(
        "/v1/data-sources",
        json={"name": "Fuente 1", "format": "json", "location": "data.json"},
    )
    source_id = ds_resp.json()["id"]

    # 3. Create pattern referencing valid data source
    pattern_payload = {
        "name": "Incompatibilidad de protocolo",
        "description": "Frecuencia de mismatch",
        "pattern_type": "relational_bivariate",
        "source_id": source_id,
    }
    pat_resp = client.post("/v1/patterns", json=pattern_payload)
    assert pat_resp.status_code == 201
    pat_id = pat_resp.json()["id"]
    assert pat_resp.json()["origin"] == "manual"

    # 4. Patch pattern
    up_resp = client.patch(f"/v1/patterns/{pat_id}", json={"status": "archived"})
    assert up_resp.status_code == 200
    assert up_resp.json()["status"] == "archived"

    # 5. Delete pattern
    del_resp = client.delete(f"/v1/patterns/{pat_id}")
    assert del_resp.status_code == 204


def test_settings_get_patch_and_reset(tmp_path):
    app = create_app(storage_dir=str(tmp_path))
    client = TestClient(app)

    # 1. Get initial settings
    get_res = client.get("/v1/settings")
    assert get_res.status_code == 200
    settings = get_res.json()
    assert settings["preferences"]["system_name"] == "Simple Domain"
    assert settings["preferences"]["default_quantile"] == 0.95

    # 2. Update allowed settings
    patch_res = client.patch(
        "/v1/settings",
        json={"preferences": {"theme_contrast": "normal", "telemetry_poll_interval_ms": 3000}},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["preferences"]["theme_contrast"] == "normal"
    assert patch_res.json()["preferences"]["telemetry_poll_interval_ms"] == 3000

    # 3. Reset settings
    reset_res = client.post("/v1/settings/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["preferences"]["theme_contrast"] == "high"
    assert reset_res.json()["preferences"]["telemetry_poll_interval_ms"] == 5000

    # 4. Reject unknown or dangerous keys
    bad_patch = client.patch("/v1/settings", json={"preferences": {"secret_token": "stolen"}})
    assert bad_patch.status_code == 400
