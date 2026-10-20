"""
Simple Domain — Rutas de Análisis de Archivos (/v1/analysis)
Ingesta segura de CSV/JSON, normalización y entrega al motor Brain.
"""

from __future__ import annotations
import dataclasses
import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile, status

from simple_domain.brain import analyze_dataset
from simple_domain.service.analysis.normalizer import normalize_csv, normalize_json

MAX_ANALYSIS_FILE_SIZE = 4 * 1024 * 1024  # 4 MB
ALLOWED_EXTENSIONS = {".csv", ".json"}

router = APIRouter(prefix="/v1/analysis", tags=["Analysis"])


def _get_repo(request: Request):
    repo = getattr(request.app.state, "analysis_repo", None)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Repositorio de análisis no inicializado.",
        )
    return repo


@router.post("", status_code=status.HTTP_201_CREATED, summary="Subir y analizar archivo CSV/JSON")
async def create_analysis(request: Request, file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se proporcionó un archivo válido.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no soportado '{ext}'. Solo se admiten archivos .csv y .json.",
        )

    # Leer con control estricto de tamaño
    raw_bytes = await file.read(MAX_ANALYSIS_FILE_SIZE + 1)
    if len(raw_bytes) > MAX_ANALYSIS_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo excede el tamaño máximo permitido de 4 MB.",
        )
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo está vacío.")

    # Decodificación de texto segura
    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content = raw_bytes.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo decodificar el archivo como texto (codificación inválida).",
            )

    # Normalización determinista
    try:
        if ext == ".csv":
            normalized = normalize_csv(content, file.filename)
        else:
            normalized = normalize_json(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Ejecución del motor Brain
    try:
        brain_result = analyze_dataset(normalized)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno durante el análisis en Brain: {str(e)}",
        )

    result_dict = dataclasses.asdict(brain_result)

    # Persistencia en Storage
    repo = _get_repo(request)
    saved_record = repo.save(
        filename=file.filename,
        format_type=normalized.format_type,
        result_dict=result_dict,
        summary=brain_result.summary,
        warnings=normalized.warnings + brain_result.global_warnings,
    )

    return saved_record


@router.get("", summary="Listar análisis persistidos")
def list_analyses(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> List[Dict[str, Any]]:
    repo = _get_repo(request)
    return repo.list_all(skip=skip, limit=limit)


@router.get("/{analysis_id}", summary="Consultar análisis por ID")
def get_analysis(analysis_id: str, request: Request) -> Dict[str, Any]:
    repo = _get_repo(request)
    record = repo.get_by_id(analysis_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Análisis con id '{analysis_id}' no encontrado.",
        )
    return record
