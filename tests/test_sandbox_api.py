"""
Simple Domain — Pruebas Unitarias e Integración de Sandbox Lab y SSE
Verifica creación de corridas, streaming SSE con Last-Event-ID y cálculo de métricas.
Menos de 180 líneas.
"""

import asyncio
import json
import pytest
from fastapi.testclient import TestClient
from simple_domain.jobs.sandbox_runner import wilson_ci
from simple_domain.service.app import create_app


@pytest.fixture
def test_setup(tmp_path):
    storage_dir = tmp_path / "storage"
    storage_dir.mkdir()
    app = create_app(storage_dir=str(storage_dir))
    with TestClient(app) as client:
        yield client, storage_dir, app


def test_wilson_ci_bounds():
    low, high = wilson_ci(0, 0)
    assert (low, high) == (0.0, 1.0)
    low, high = wilson_ci(10, 10)
    assert low > 0.65 and high == 1.0
    low, high = wilson_ci(5, 10)
    assert 0.23 < low < 0.5 < high < 0.77


def test_sandbox_runs_api_and_sse(test_setup):
    client, storage_dir, app = test_setup

    # 1. Crear corrida
    payload = {
        "level": "L1_direct_lookup",
        "seed": 42,
        "system": "rules",
        "penalty_lambda": 5.0,
        "max_episodes": 3,
    }
    resp = client.post("/v1/sandbox/runs", json=payload)
    assert resp.status_code == 201
    run = resp.json()
    run_id = run["id"]
    assert run_id.startswith("sb_")
    assert run["status"] == "running"
    assert "commit" in run
    assert "dataset_hash" in run
    assert "weights_hash" in run

    # 2. Listar corridas
    list_resp = client.get("/v1/sandbox/runs")
    assert list_resp.status_code == 200
    runs = list_resp.json()
    assert any(r["id"] == run_id for r in runs)

    # 3. Consultar corrida individual
    get_resp = client.get(f"/v1/sandbox/runs/{run_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == run_id

    # 4. Inyectar eventos de prueba para validar streaming y Last-Event-ID
    broker = app.state.event_broker
    async def emit():
        await broker.publish(run_id, f"{run_id}_ep_001", "EPISODE_STARTED", {"episode": 1})
        await broker.publish(run_id, f"{run_id}_ep_001", "RIR_PROPOSED", {"episode": 1, "status": "VALID"})
        await broker.publish(run_id, f"{run_id}_ep_001", "VERIFIER_EVALUATED", {"reward": 1.0, "is_exact_match": True})
        await broker.publish(run_id, f"{run_id}_ep_001", "EPISODE_COMPLETED", {"episode": 1})
        await broker.publish(run_id, "final", "sandbox.completed", {"metrics": {"mean_reward": 1.0}})

    asyncio.run(emit())

    # 5. Consumir SSE
    with client.stream("GET", f"/v1/sandbox/runs/{run_id}/events") as sse_stream:
        lines = [line for line in sse_stream.iter_lines() if line]
        assert any("EPISODE_STARTED" in l for l in lines)
        assert any("sandbox.completed" in l for l in lines)

    # 6. Probar Last-Event-ID
    events = app.state.sandbox_repo.get_events(run_id)
    assert len(events) >= 5
    mid_id = events[2]["id"]
    with client.stream("GET", f"/v1/sandbox/runs/{run_id}/events", headers={"Last-Event-ID": mid_id}) as sse_stream:
        replayed = [line for line in sse_stream.iter_lines() if line]
        assert not any(events[0]["id"] in l for l in replayed)
        assert any(events[3]["id"] in l for l in replayed)
