"""
Simple Domain — Rutas del Ciclo de Vida de Archivos (/v1/archive)
Envío asíncrono, consulta de estado, eventos SSE y recuperación de resultados.
"""

from __future__ import annotations
import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, Header, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse

from simple_domain.service.archive_schemas import ArchiveSubmitResponse

MAX_ARCHIVE_FILE_SIZE = 4 * 1024 * 1024  # 4 MB
ALLOWED_EXTENSIONS = {".csv", ".json"}

router = APIRouter(prefix="/v1/archive", tags=["Archive"])


def _get_services(request: Request):
    repo = getattr(request.app.state, "archive_repo", None)
    coord = getattr(request.app.state, "job_coordinator", None)
    events = getattr(request.app.state, "event_broker", None)
    conv_repo = getattr(request.app.state, "conversation_repo", None)
    if not repo or not coord or not events:
        raise HTTPException(status_code=503, detail="Servicios de archive no inicializados.")
    return repo, coord, events, conv_repo


@router.post("/submit", status_code=status.HTTP_202_ACCEPTED, response_model=ArchiveSubmitResponse)
async def submit_archive(
    request: Request,
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
) -> ArchiveSubmitResponse:
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó un archivo válido.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Formato no soportado '{ext}'. Usa .csv o .json.")

    raw_bytes = await file.read(MAX_ARCHIVE_FILE_SIZE + 1)
    if len(raw_bytes) > MAX_ARCHIVE_FILE_SIZE:
        raise HTTPException(status_code=413, detail="El archivo excede el tamaño máximo permitido de 4 MB.")
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content = raw_bytes.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Codificación de archivo inválida.")

    repo, coord, _, conv_repo = _get_services(request)

    # Validar o crear conversación asociada
    target_conv_id = conversation_id
    if target_conv_id and conv_repo:
        conv = conv_repo.get_by_id(target_conv_id)
        if not conv:
            conv = conv_repo.create(title=f"Análisis · {file.filename}")
            target_conv_id = conv["id"]
    elif conv_repo:
        conv = conv_repo.create(title=f"Análisis · {file.filename}")
        target_conv_id = conv["id"]
    else:
        target_conv_id = "conv_default"

    archive_id, job_id = repo.create_archive(
        filename=file.filename,
        format_type=ext.lstrip("."),
        raw_content=content,
        conversation_id=target_conv_id,
    )

    if conv_repo and target_conv_id:
        conv_repo.add_message(
            conv_id=target_conv_id,
            role="user",
            content=f"Adjunto archivo para análisis: **{file.filename}**",
            archive_id=archive_id,
            job_id=job_id,
        )

    await coord.enqueue(archive_id, job_id, file.filename, ext, content, target_conv_id)

    return ArchiveSubmitResponse(
        archive_id=archive_id,
        job_id=job_id,
        conversation_id=target_conv_id,
        status="accepted",
        events_url=f"/v1/archive/{archive_id}/events",
        status_url=f"/v1/archive/{archive_id}",
        result_url=f"/v1/archive/{archive_id}/result",
    )


@router.get("", summary="Listar archivos archivados")
def list_archives(request: Request, skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)) -> List[Dict[str, Any]]:
    repo, _, _, _ = _get_services(request)
    return repo.list_all(skip=skip, limit=limit)


@router.get("/{archive_id}", summary="Consultar estado de archivo")
def get_archive(archive_id: str, request: Request) -> Dict[str, Any]:
    repo, _, _, _ = _get_services(request)
    manifest = repo.get_manifest(archive_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Archivo '{archive_id}' no encontrado.")
    return manifest


@router.get("/{archive_id}/result", summary="Obtener resultado del análisis")
def get_archive_result(archive_id: str, request: Request) -> Any:
    repo, _, _, _ = _get_services(request)
    manifest = repo.get_manifest(archive_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Archivo '{archive_id}' no encontrado.")

    st = manifest.get("status")
    if st == "completed":
        res = repo.get_result(archive_id)
        return res or {"status": "completed", "summary": manifest.get("summary")}
    elif st == "failed":
        return JSONResponse(status_code=422, content={"status": "failed", "error": manifest.get("error")})
    return JSONResponse(status_code=200, content={"status": st, "message": "Procesamiento en curso."})


@router.get("/{archive_id}/events", summary="Stream SSE de eventos del archivo")
async def get_archive_events(
    archive_id: str, request: Request, last_event_id: Optional[str] = Header(None, alias="Last-Event-ID")
):
    repo, _, events, _ = _get_services(request)
    manifest = repo.get_manifest(archive_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Archivo '{archive_id}' no encontrado.")

    return StreamingResponse(
        events.stream(archive_id, last_event_id=last_event_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
