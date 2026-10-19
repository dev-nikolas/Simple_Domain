import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from simple_domain.service.app import create_app
from simple_domain.service.modular_setup import get_canonical_storage_dir
from simple_domain.storage.json_store import JsonStore, StorageCorruptionError


def test_canonical_storage_directory_resolution():
    # Resolves to storage/ under project root
    canonical = get_canonical_storage_dir()
    assert os.path.isabs(canonical)
    assert canonical.endswith("storage")
    assert os.path.exists(canonical)

    # Custom override priority
    custom = get_canonical_storage_dir("/custom/path")
    assert custom == os.path.abspath("/custom/path")


def test_startup_with_empty_storage(tmp_path):
    empty_dir = tmp_path / "empty_storage"
    empty_dir.mkdir()
    app = create_app(storage_dir=str(empty_dir))
    client = TestClient(app)

    # All modules return valid empty/default structures without crashing
    assert client.get("/v1/research/experiments").status_code == 200
    assert client.get("/v1/research/experiments").json() == []

    assert client.get("/v1/data-sources").status_code == 200
    assert client.get("/v1/data-sources").json() == []

    assert client.get("/v1/patterns").status_code == 200
    assert client.get("/v1/patterns").json() == []

    settings_res = client.get("/v1/settings")
    assert settings_res.status_code == 200
    assert settings_res.json()["preferences"]["system_name"] == "Simple Domain"


def test_persistence_and_no_accidental_cwd_write(tmp_path, monkeypatch):
    test_storage = tmp_path / "canonical_store"
    # Change CWD to a subfolder to ensure files are not written relative to CWD
    workdir = tmp_path / "workdir"
    workdir.mkdir()
    monkeypatch.chdir(workdir)

    app1 = create_app(storage_dir=str(test_storage))
    client1 = TestClient(app1)

    exp_payload = {"title": "Persistence Test", "status": "draft"}
    res = client1.post("/v1/research/experiments", json=exp_payload)
    assert res.status_code == 201
    exp_id = res.json()["id"]

    # Verify written in test_storage, NOT in workdir
    assert (test_storage / "research.json").exists()
    assert not (workdir / "research.json").exists()
    assert not (workdir / "experiments.json").exists()

    # Restart app and verify read
    app2 = create_app(storage_dir=str(test_storage))
    client2 = TestClient(app2)
    get_res = client2.get(f"/v1/research/experiments/{exp_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Persistence Test"


def test_corrupted_json_returns_controlled_error(tmp_path):
    storage_dir = tmp_path / "corrupt_store"
    storage_dir.mkdir()
    bad_file = storage_dir / "research.json"
    bad_file.write_text("{ CORRUPTED NOT JSON }", encoding="utf-8")

    app = create_app(storage_dir=str(storage_dir))
    client = TestClient(app)

    res = client.get("/v1/research/experiments")
    assert res.status_code == 500
    assert res.json()["error_code"] == "STORAGE_CORRUPTED"
