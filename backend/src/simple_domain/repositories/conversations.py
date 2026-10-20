"""
Simple Domain — Repositorio de Conversaciones y Mensajes
Persistencia JSON atómica en storage/conversations.json.
"""

from __future__ import annotations
from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from simple_domain.storage.json_store import JsonStore

DEFAULT_CONV_TITLE = "Nuevo análisis"


class ConversationRepository:
    def __init__(self, store: JsonStore):
        self.store = store

    def create(self, title: Optional[str] = None) -> Dict[str, Any]:
        convs = self.store.read()
        now = datetime.now(timezone.utc).isoformat()
        conv_id = f"conv_{uuid.uuid4().hex[:10]}"
        record = {
            "id": conv_id,
            "title": title.strip() if title and title.strip() else DEFAULT_CONV_TITLE,
            "created_at": now,
            "updated_at": now,
            "messages": [],
            "archive_ids": [],
        }
        convs.insert(0, record)
        self.store.write(convs)
        return record

    def list_all(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        convs = self.store.read()
        convs_sorted = sorted(convs, key=lambda c: c.get("updated_at", ""), reverse=True)
        return convs_sorted[skip : skip + limit]

    def get_by_id(self, conv_id: str) -> Optional[Dict[str, Any]]:
        convs = self.store.read()
        for c in convs:
            if c.get("id") == conv_id:
                return c
        return None

    def add_message(
        self,
        conv_id: str,
        role: str,
        content: str,
        archive_id: Optional[str] = None,
        job_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        convs = self.store.read()
        now = datetime.now(timezone.utc).isoformat()
        for c in convs:
            if c.get("id") == conv_id:
                msg_id = f"msg_{uuid.uuid4().hex[:8]}"
                msg = {
                    "id": msg_id,
                    "role": role,
                    "content": content,
                    "created_at": now,
                    "archive_id": archive_id,
                    "job_id": job_id,
                    "metadata": metadata or {},
                }
                c.setdefault("messages", []).append(msg)
                if archive_id and archive_id not in c.setdefault("archive_ids", []):
                    c["archive_ids"].append(archive_id)
                c["updated_at"] = now
                self.store.write(convs)
                return msg
        raise KeyError(f"Conversación con id '{conv_id}' no existe.")

    def update_title_if_default(self, conv_id: str, new_title: str) -> bool:
        """Actualiza el título únicamente si el actual es el provisional o está vacío."""
        convs = self.store.read()
        for c in convs:
            if c.get("id") == conv_id:
                current_title = (c.get("title") or "").strip()
                if not current_title or current_title == DEFAULT_CONV_TITLE:
                    c["title"] = new_title.strip()
                    c["updated_at"] = datetime.now(timezone.utc).isoformat()
                    self.store.write(convs)
                    return True
                return False
        return False

    def attach_archive(self, conv_id: str, archive_id: str) -> bool:
        convs = self.store.read()
        for c in convs:
            if c.get("id") == conv_id:
                archives = c.setdefault("archive_ids", [])
                if archive_id not in archives:
                    archives.append(archive_id)
                    c["updated_at"] = datetime.now(timezone.utc).isoformat()
                    self.store.write(convs)
                    return True
                return False
        return False
