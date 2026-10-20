"""
Simple Domain — Esquemas Pydantic para el Ciclo de Vida de Archivos (Archive)
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ArchiveSubmitResponse(BaseModel):
    archive_id: str
    job_id: str
    conversation_id: str
    status: str
    events_url: str
    status_url: str
    result_url: str


class ArchiveManifest(BaseModel):
    archive_id: str
    job_id: str
    filename: str
    format: str
    size_bytes: int
    status: str
    conversation_id: Optional[str] = None
    created_at: str
    updated_at: str
    error: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None
    warnings: List[str] = Field(default_factory=list)


class ArchiveEvent(BaseModel):
    id: str
    archive_id: str
    job_id: str
    type: str
    timestamp: str
    data: Dict[str, Any] = Field(default_factory=dict)
