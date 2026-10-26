"""
Simple Domain — Rutas de Sandbox Curricular RELIC (/v1/sandbox)
Endpoints para creación de corridas, consulta de historial y streaming SSE con Last-Event-ID.
Menos de 180 líneas.
"""

from __future__ import annotations
import asyncio
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/v1/sandbox", tags=["Sandbox"])


class SandboxRunCreateRequest(BaseModel):
    level: str = Field("L1_direct_lookup", description="Nivel curricular (L1, L2, etc. o 'all')")
    seed: int = Field(42, description="Semilla aleatoria para reproducibilidad")
    system: str = Field("rules", description="Sistema a evaluar: 'rules', 'slot_filler', 'model'")
    penalty_lambda: float = Field(5.0, description="Factor de penalización asimétrica lambda")
    max_episodes: int = Field(30, ge=1, le=500, description="Cantidad máxima de episodios en la corrida")


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

    commit = runner.get_commit_hash()
    dataset_hash = runner.get_dataset_hash()
    weights_hash = runner.get_weights_hash()

    manifest = repo.create_run(
        level=req.level,
        seed=req.seed,
        system=req.system,
        penalty_lambda=req.penalty_lambda,
        commit_hash=commit,
        dataset_hash=dataset_hash,
        weights_hash=weights_hash,
        total_episodes=req.max_episodes,
    )

    # Lanzar la corrida de forma asíncrona en segundo plano
    asyncio.create_task(
        runner.run(
            run_id=manifest["id"],
            level=req.level,
            seed=req.seed,
            system=req.system,
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
    repo, _, _ = _get_services(request)
    manifest = repo.get_run(run_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Corrida de sandbox '{run_id}' no encontrada.")
    return manifest


@router.get("/runs/{run_id}/events", summary="Stream SSE de eventos de la corrida con soporte Last-Event-ID")
async def get_sandbox_run_events(
    run_id: str,
    request: Request,
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
):
    repo, broker, _ = _get_services(request)
    manifest = repo.get_run(run_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Corrida de sandbox '{run_id}' no encontrada.")

    return StreamingResponse(
        broker.stream(run_id, last_event_id=last_event_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
