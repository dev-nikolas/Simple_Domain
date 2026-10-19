"""
Simple Domain — Rutas del Módulo de Investigación (/v1/research)
"""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, status

from simple_domain.repositories.experiments import ExperimentRepository
from simple_domain.service.modular_schemas import (
    ExperimentCreate,
    ExperimentResponse,
    ExperimentUpdate,
)

router = APIRouter(prefix="/v1/research", tags=["Research"])


def _get_repo(request: Request) -> ExperimentRepository:
    repo = getattr(request.app.state, "experiment_repo", None)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Repositorio de investigaciones no inicializado.",
        )
    return repo


@router.get("/experiments", response_model=List[ExperimentResponse], summary="Listar experimentos")
def list_experiments(
    request: Request,
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrar por estado"),
) -> List[ExperimentResponse]:
    repo = _get_repo(request)
    items = repo.list_all(status=status_filter)
    return [ExperimentResponse(**x) for x in items]


@router.post(
    "/experiments",
    response_model=ExperimentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear experimento",
)
def create_experiment(payload: ExperimentCreate, request: Request) -> ExperimentResponse:
    repo = _get_repo(request)
    try:
        created = repo.create(payload.model_dump(exclude_unset=True))
        return ExperimentResponse(**created)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/experiments/{experiment_id}", response_model=ExperimentResponse, summary="Consultar experimento")
def get_experiment(experiment_id: str, request: Request) -> ExperimentResponse:
    repo = _get_repo(request)
    record = repo.get_by_id(experiment_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experimento con id '{experiment_id}' no encontrado.",
        )
    return ExperimentResponse(**record)


@router.patch("/experiments/{experiment_id}", response_model=ExperimentResponse, summary="Modificar experimento")
def update_experiment(
    experiment_id: str,
    payload: ExperimentUpdate,
    request: Request,
) -> ExperimentResponse:
    repo = _get_repo(request)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un campo para actualizar.",
        )
    try:
        updated = repo.update(experiment_id, updates)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Experimento con id '{experiment_id}' no encontrado.",
            )
        return ExperimentResponse(**updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/experiments/{experiment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar experimento")
def delete_experiment(experiment_id: str, request: Request):
    repo = _get_repo(request)
    success = repo.delete(experiment_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experimento con id '{experiment_id}' no encontrado.",
        )
    return None
