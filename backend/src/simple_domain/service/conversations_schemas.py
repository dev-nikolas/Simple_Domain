"""
Simple Domain — Esquemas Pydantic para Conversaciones y Mensajes
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    role: str = Field("user", pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=10000)
    metadata: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str
    archive_id: Optional[str] = None
    job_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=120)


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    messages: List[MessageResponse] = Field(default_factory=list)
    archive_ids: List[str] = Field(default_factory=list)
