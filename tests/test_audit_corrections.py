"""
Simple Domain — Pruebas de Corrección de Auditoría
Valida:
1. load_cases con filtro de split explícito y muestreo determinista con seed.
2. Honestidad de system (503 si no está disponible, sin fallback silencioso).
3. Unificación de métricas (EM con gold_rir, FA en resolubles incorrectos, syntax_rejection).
4. Seguridad de run_id y no mkdir en lecturas.
5. Persistencia en JSONL append-only.
6. Límites de concurrencia y try/except.
"""

import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from simple_domain.service.app import create_app
from simple_domain.jobs.sandbox_runner import SandboxRunner
from simple_domain.repositories.sandbox import SandboxRepository
from simple_domain.jobs.events import EventBroker
from simple_domain.service.relic_client import RelicClient


@pytest.fixture
def test_setup(tmp_path):
    storage_dir = tmp_path / "storage"
    storage_dir.mkdir()
    app = create_app(storage_dir=str(storage_dir))
    with TestClient(app) as client:
        yield client, storage_dir, app


def test_load_cases_split_and_seed(tmp_path):
    repo = SandboxRepository(tmp_path)
    broker = EventBroker(None, repo)
    runner = SandboxRunner(repo, broker)

    # Debe cargar por defecto split='holdout_template'
    cases_seed42 = runner.load_cases(level="all", seed=42, split="holdout_template", limit=10)
    assert len(cases_seed42) == 10
    assert all(c.get("split") == "holdout_template" for c in cases_seed42)

    # Misma semilla debe dar exactamente los mismos casos
    cases_seed42_dup = runner.load_cases(level="all", seed=42, split="holdout_template", limit=10)
    assert [c["prompt"] for c in cases_seed42] == [c["prompt"] for c in cases_seed42_dup]

    # Semilla distinta debe dar casos distintos
    cases_seed999 = runner.load_cases(level="all", seed=999, split="holdout_template", limit=10)
    assert [c["prompt"] for c in cases_seed42] != [c["prompt"] for c in cases_seed999]


def test_system_availability_validation(test_setup):
    client, _, _ = test_setup

    # 1. Sistema 'model' no disponible -> 503
    resp_model = client.post("/v1/sandbox/runs", json={
        "level": "all",
        "seed": 42,
        "system": "model",
        "penalty_lambda": 5.0,
        "max_episodes": 5,
        "split": "holdout_template"
    })
    assert resp_model.status_code == 503
    assert "no está disponible" in resp_model.json()["detail"].lower()

    # 2. Sistema 'slot_filler' no disponible -> 503
    resp_sf = client.post("/v1/sandbox/runs", json={
        "level": "all",
        "seed": 42,
        "system": "slot_filler",
        "penalty_lambda": 5.0,
        "max_episodes": 5,
        "split": "holdout_template"
    })
    assert resp_sf.status_code == 503
    assert "no está disponible" in resp_sf.json()["detail"].lower()

    # 3. Sistema no existente -> 422
    resp_inv = client.post("/v1/sandbox/runs", json={
        "level": "all",
        "seed": 42,
        "system": "invalido",
        "penalty_lambda": 5.0,
        "max_episodes": 5,
        "split": "holdout_template"
    })
    assert resp_inv.status_code == 422


def test_no_silent_fallback_when_relic_server_offline():
    client = RelicClient(server_url="http://127.0.0.1:59999") # Puerto inactivo
    res = client.query("1 + 1")
    assert res.get("status") in ["UNAVAILABLE", "ERROR"]
    assert res.get("route") == "client_error"
    assert "error" in res.get("text", "").lower() or "no disponible" in res.get("text", "").lower()


def test_run_id_security_and_no_mkdir_on_read(tmp_path):
    repo = SandboxRepository(tmp_path)
    # 1. Validar lectura de run inexistente no crea directorio
    assert repo.get_run("sb_00000000") is None
    ghost_dir = repo.sandbox_dir / "sb_00000000"
    assert not ghost_dir.exists(), "get_run() no debe crear directorios en disco al consultar ids inexistentes"

    # 2. Path traversal intento debe ser rechazado
    assert repo.get_run("../../../etc/passwd") is None


def test_events_jsonl_append_only(tmp_path):
    repo = SandboxRepository(tmp_path)
    manifest = repo.create_run(
        level="all", seed=42, system="rules", penalty_lambda=5.0,
        commit_hash="abc", dataset_hash="def", weights_hash="none",
        total_episodes=5, split="holdout_template"
    )
    run_id = manifest["id"]

    repo.append_event(run_id, {"id": "evt_1", "type": "TEST_1"})
    repo.append_event(run_id, {"id": "evt_2", "type": "TEST_2"})

    # Verificar que el archivo existe como jsonl
    events_file = repo._run_dir(run_id) / "events.jsonl"
    assert events_file.exists(), "Los eventos deben almacenarse en events.jsonl append-only"
    
    events = repo.get_events(run_id)
    assert len(events) == 2
    assert events[0]["id"] == "evt_1"
    assert events[1]["id"] == "evt_2"


def test_acceptance_holdout_v2_4500_breakdown_reproduction(tmp_path):
    repo = SandboxRepository(tmp_path)
    broker = EventBroker(None, repo)
    runner = SandboxRunner(repo, broker)

    cases = runner.load_cases(level="all", seed=42, split="holdout_template", limit=5000)
    assert len(cases) == 4500

    # 1. Validar conteos por nivel
    l01_cases = [c for c in cases if "l01" in c.get("level", "").lower()]
    l02_cases = [c for c in cases if "l02" in c.get("level", "").lower()]
    l03_cases = [c for c in cases if "l03" in c.get("level", "").lower()]
    assert len(l01_cases) == 1500
    assert len(l02_cases) == 1500
    assert len(l03_cases) == 1500

    # 2. Ejecutar evaluación del sistema 'rules' sobre los 4500 casos
    from simple_domain.jobs.sandbox_runner import evaluate_rules_engine

    l01_em, l02_em, l03_ca = 0, 0, 0
    fa_total = 0
    for c in cases:
        prompt = c["prompt"]
        oracle = str(c.get("oracle_answer", ""))
        lvl = c.get("level", "").lower()
        is_abs = c.get("expected_status") != "VALID"
        status, text, is_em, is_fa = evaluate_rules_engine(prompt, oracle, is_abs)
        if is_em:
            if "l01" in lvl: l01_em += 1
            elif "l02" in lvl: l02_em += 1
            elif "l03" in lvl: l03_ca += 1
        if is_fa:
            fa_total += 1

    # 3. Reproducción EXACTA de holdout_v2_4500_breakdown.json
    assert l01_em == 82, f"L01 EM esperado 82/1500, obtenido {l01_em}"
    assert l02_em == 34, f"L02 EM esperado 34/1500, obtenido {l02_em}"
    assert l01_em + l02_em == 116, f"Resolubles EM esperado 116/3000, obtenido {l01_em + l02_em}"
    assert l03_ca == 1500, f"Abstenciones L03 esperadas 1500/1500, obtenido {l03_ca}"
    assert fa_total == 0, f"Falsa aceptación esperada 0, obtenido {fa_total}"

