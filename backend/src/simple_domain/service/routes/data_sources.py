"""
Simple Domain — Rutas del Módulo de Fuentes de Datos (/v1/data-sources)
"""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, status

from simple_domain.repositories.data_sources import DataSourceRepository
from simple_domain.service.modular_schemas import (
    DataSourceCreate,
    DataSourceResponse,
    DataSourceUpdate,
)

router = APIRouter(prefix="/v1/data-sources", tags=["Data Sources"])


def _get_repo(request: Request) -> DataSourceRepository:
    repo = getattr(request.app.state, "data_source_repo", None) or getattr(
        request.app.state, "data_sources_repo", None
    )
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Repositorio de fuentes de datos no inicializado.",
        )
    return repo


@router.get("", response_model=List[DataSourceResponse], summary="Listar fuentes de datos")
def list_data_sources(
    request: Request,
    format_filter: Optional[str] = Query(None, alias="format", description="Filtrar por formato (csv, json, xlsx)"),
) -> List[DataSourceResponse]:
    repo = _get_repo(request)
    items = repo.list_all(format_filter=format_filter)
    return [DataSourceResponse(**x) for x in items]


@router.post(
    "",
    response_model=DataSourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar fuente de datos",
)
def create_data_source(payload: DataSourceCreate, request: Request) -> DataSourceResponse:
    repo = _get_repo(request)
    try:
        created = repo.create(payload.model_dump(exclude_unset=True))
        return DataSourceResponse(**created)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))



@router.get("/{source_id}", response_model=DataSourceResponse, summary="Consultar fuente de datos")
def get_data_source(source_id: str, request: Request) -> DataSourceResponse:
    repo = _get_repo(request)
    record = repo.get_by_id(source_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fuente de datos con id '{source_id}' no encontrada.",
        )
    return DataSourceResponse(**record)


@router.patch("/{source_id}", response_model=DataSourceResponse, summary="Actualizar fuente de datos")
def update_data_source(
    source_id: str,
    payload: DataSourceUpdate,
    request: Request,
) -> DataSourceResponse:
    repo = _get_repo(request)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un campo para actualizar.",
        )
    try:
        updated = repo.update(source_id, updates)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fuente de datos con id '{source_id}' no encontrada.",
            )
        return DataSourceResponse(**updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar fuente de datos del catálogo")
def delete_data_source(source_id: str, request: Request):
    repo = _get_repo(request)
    success = repo.delete(source_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fuente de datos con id '{source_id}' no encontrada.",
        )
    return None

