"""
Simple Domain — Rutas de Sandbox Curricular RELIC (/v1/sandbox)
Endpoints para creación de corridas, consulta de historial y streaming SSE con Last-Event-ID.
Menos de 180 líneas.
"""

from __future__ import annotations
import asyncio
from enum import Enum
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/v1/sandbox", tags=["Sandbox"])
RUN_ID_REGEX = re.compile(r"^sb_[a-f0-9]{8}$")


class SandboxLevelEnum(str, Enum):
    all = "all"
    l1 = "L1_direct_lookup"
    l2 = "L2_inventory_operations"
    l3 = "L3_epistemic_rejection"
    l01 = "l01_direct_arithmetic"
    l02 = "l02_inventory_units"
    l03 = "l03_epistemic_rejection"


class SandboxSystemEnum(str, Enum):
    rules = "rules"
    slot_filler = "slot_filler"
    model = "model"


class SandboxSplitEnum(str, Enum):
    holdout_template = "holdout_template"
    train = "train"
    val = "val"
    test = "test"


class SandboxRunCreateRequest(BaseModel):
    level: SandboxLevelEnum = Field(SandboxLevelEnum.all, description="Nivel curricular o 'all'")
    seed: int = Field(42, description="Semilla aleatoria para reproducibilidad")
    system: SandboxSystemEnum = Field(SandboxSystemEnum.rules, description="Sistema a evaluar")
    split: SandboxSplitEnum = Field(SandboxSplitEnum.holdout_template, description="Split del dataset")
    penalty_lambda: float = Field(5.0, description="Factor de penalización asimétrica lambda")
    max_episodes: int = Field(30, ge=1, le=5000, description="Cantidad máxima de episodios")


def _get_services(request: Request):
    repo = getattr(request.app.state, "sandbox_repo", None)
    broker = getattr(request.app.state, "event_broker", None)
    runner = getattr(request.app.state, "sandbox_runner", None)
    if not repo or not broker or not runner:
        raise HTTPException(status_code=503, detail="Servicios de Sandbox no inicializados.")
    return repo, broker, runner


@router.post("/runs", status_code=status.HTTP_201_CREATED, summary="Crear y lanzar corrida en sandbox lógico")
async def create_sandbox_run(req: SandboxRunCreateRequest, request: Request) -> Dict[str, Any]:
    repo, _, runner = _get_services(request)

    # 1. Honestidad de sistemas: 503 si el sistema no está servido en este entorno
    if req.system in [SandboxSystemEnum.model, SandboxSystemEnum.slot_filler]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"El sistema '{req.system.value}' no está disponible en este entorno. Solo el sistema 'rules' está activo.",
        )

    # 2. Control de concurrencia (máximo 2 corridas activas simultáneas)
    active = getattr(request.app.state, "active_sandbox_runs", set())
    active = {rid for rid in active if (r := repo.get_run(rid)) and r.get("status") == "running"}
    request.app.state.active_sandbox_runs = active
    if len(active) >= 2:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Límite de concurrencia alcanzado: máximo 2 corridas simultáneas activas.",
        )

    commit = runner.get_commit_hash()
    dataset_hash = runner.get_dataset_hash()
    weights_hash = runner.get_weights_hash()

    manifest = repo.create_run(
        level=req.level.value,
        seed=req.seed,
        system=req.system.value,
        split=req.split.value,
        penalty_lambda=req.penalty_lambda,
        commit_hash=commit,
        dataset_hash=dataset_hash,
        weights_hash=weights_hash,
        total_episodes=req.max_episodes,
    )
    active.add(manifest["id"])

    # Lanzar la corrida en background
    asyncio.create_task(
        runner.run(
            run_id=manifest["id"],
            level=req.level.value,
            seed=req.seed,
            system=req.system.value,
            split=req.split.value,
            penalty_lambda=req.penalty_lambda,
            max_episodes=req.max_episodes,
        )
    )
    return manifest


@router.get("/runs", summary="Listar corridas de sandbox con métricas y hashes")
def list_sandbox_runs(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> List[Dict[str, Any]]:
    repo, _, _ = _get_services(request)
    return repo.list_runs(skip=skip, limit=limit)


@router.get("/runs/{run_id}", summary="Consultar manifiesto y detalles de una corrida")
def get_sandbox_run(run_id: str, request: Request) -> Dict[str, Any]:
    if not RUN_ID_REGEX.match(run_id):
        raise HTTPException(status_code=400, detail="Formato de run_id no válido.")
    repo, _, _ = _get_services(request)
    manifest = repo.get_run(run_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Corrida de sandbox '{run_id}' no encontrada.")
    return manifest


@router.get("/runs/{run_id}/events", summary="Stream SSE de eventos con soporte Last-Event-ID")
async def get_sandbox_run_events(
    run_id: str,
    request: Request,
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
):
    if not RUN_ID_REGEX.match(run_id):
        raise HTTPException(status_code=400, detail="Formato de run_id no válido.")
    repo, broker, _ = _get_services(request)
    manifest = repo.get_run(run_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Corrida de sandbox '{run_id}' no encontrada.")

    return StreamingResponse(
        broker.stream(run_id, last_event_id=last_event_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/trace-query", summary="Traza 3D hop-by-hop desacoplada")
def trace_sandbox_query(payload: Dict[str, str], request: Request) -> Dict[str, Any]:
    import time
    from simple_domain.service.relic_client import RelicClient
    q = payload.get("query", "").strip() or "evaluar consistencia"
    t0 = time.time()
    relic_res = RelicClient().query(q, enable_trace=True, allow_fallback=True)
    hop2_ms = round((time.time() - t0) * 1000, 2)
    st = relic_res.get("status", "UNSUPPORTED")
    match_type = "EXACT_MATCH" if st == "VALID" else ("CORRECT_ABSTENTION" if "epistemic" in relic_res.get("route", "") or "out_of_domain" in relic_res.get("route", "") else "REJECTION")
    return {
        "query": q, "match_type": match_type,
        "connections": [
            {"name": "Canal 1", "from": "Capa Cliente", "to": "Orquestador de Dominio", "type": "Canal Local", "status": "ONLINE", "latency_ms": 1.2},
            {"name": "Canal 2", "from": "Orquestador de Dominio", "to": "Motor de Razonamiento", "type": "Canal de Inferencia", "status": "ONLINE" if relic_res.get("responding_system") != "none" else "DEGRADED", "latency_ms": hop2_ms},
        ],
        "relic": relic_res,
    }
