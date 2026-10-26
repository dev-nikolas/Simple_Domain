"""
Simple Domain — Rutas de Conversaciones y Mensajes (/v1/conversations)
Gestión del historial conversacional persistente con delegación al motor RELIC.
"""

from __future__ import annotations
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Query, Request, status

from simple_domain.service.conversations_schemas import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from simple_domain.service.relic_client import RelicClient

router = APIRouter(prefix="/v1/conversations", tags=["Conversations"])
relic_client = RelicClient()


def _get_repo(request: Request):
    repo = getattr(request.app.state, "conversation_repo", None)
    if not repo:
        raise HTTPException(status_code=503, detail="Repositorio de conversaciones no inicializado.")
    return repo


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ConversationResponse)
def create_conversation(req: ConversationCreate, request: Request) -> Dict[str, Any]:
    repo = _get_repo(request)
    return repo.create(title=req.title)


@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> List[Dict[str, Any]]:
    repo = _get_repo(request)
    return repo.list_all(skip=skip, limit=limit)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str, request: Request) -> Dict[str, Any]:
    repo = _get_repo(request)
    conv = repo.get_by_id(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversación '{conversation_id}' no encontrada.")
    return conv


@router.post("/{conversation_id}/messages", status_code=status.HTTP_201_CREATED, response_model=MessageResponse)
def add_message(conversation_id: str, req: MessageCreate, request: Request) -> Dict[str, Any]:
    repo = _get_repo(request)
    conv = repo.get_by_id(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversación '{conversation_id}' no encontrada.")

    # 1. Registrar mensaje del usuario/operador
    user_msg = repo.add_message(
        conv_id=conversation_id,
        role=req.role or "user",
        content=req.content,
        metadata=req.metadata,
    )

    # 2. Si el mensaje es de usuario, consultar a RELIC y registrar respuesta del asistente
    if (req.role or "user") == "user" and req.content.strip():
        relic_res = relic_client.query(req.content)
        assistant_content = relic_res.get("text", "")
        repo.add_message(
            conv_id=conversation_id,
            role="assistant",
            content=assistant_content,
            metadata={
                "route": relic_res.get("route"),
                "status": relic_res.get("status"),
                "latency_ms": relic_res.get("latency_ms"),
                "rss_mb": relic_res.get("rss_mb"),
            },
        )

    return user_msg


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
def list_messages(conversation_id: str, request: Request) -> List[Dict[str, Any]]:
    repo = _get_repo(request)
    conv = repo.get_by_id(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversación '{conversation_id}' no encontrada.")
    return conv.get("messages", [])
