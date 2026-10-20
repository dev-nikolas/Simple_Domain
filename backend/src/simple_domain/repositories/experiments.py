"""
Simple Domain — Repositorio de Investigaciones y Experimentos
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from simple_domain.storage.json_store import JsonStore


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ExperimentRepository:
    """Repositorio para gestionar registros de investigaciones y experimentos."""

    def __init__(self, store: JsonStore | str | Path):
        if isinstance(store, (str, Path)):
            self.store = JsonStore(store, default_factory=list)
        else:
            self.store = store

    def list_all(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        items = self.store.read()
        if not isinstance(items, list):
            items = []
        if status:
            return [x for x in items if x.get("status") == status]
        return list(items)

    def get_by_id(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        items = self.list_all()
        for x in items:
            if x.get("id") == experiment_id:
                return x
        return None

    def create(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        items = self.list_all()
        now = _utcnow_iso()
        record_id = payload.get("id") or f"exp_{uuid.uuid4().hex[:8]}"
        
        # Evitar duplicados de ID
        if any(x.get("id") == record_id for x in items):
            raise ValueError(f"Ya existe un experimento con id '{record_id}'")

        record: Dict[str, Any] = {
            "id": record_id,
            "title": str(payload.get("title", "")).strip(),
            "description": payload.get("description"),
            "hypothesis": payload.get("hypothesis"),
            "status": payload.get("status", "draft"),
            "notes": payload.get("notes"),
            "created_at": now,
            "updated_at": now,
            "metadata": payload.get("metadata") or {},
        }
        items.append(record)
        self.store.write(items)
        return record

    def update(self, experiment_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        items = self.list_all()
        for i, x in enumerate(items):
            if x.get("id") == experiment_id:
                allowed_fields = {"title", "description", "hypothesis", "status", "notes", "metadata"}
                for k, v in updates.items():
                    if k in allowed_fields:
                        x[k] = v
                x["updated_at"] = _utcnow_iso()
                items[i] = x
                self.store.write(items)
                return x
        return None

    def delete(self, experiment_id: str) -> bool:
        items = self.list_all()
        initial_len = len(items)
        filtered = [x for x in items if x.get("id") != experiment_id]
        if len(filtered) < initial_len:
            self.store.write(filtered)
            return True
        return False
