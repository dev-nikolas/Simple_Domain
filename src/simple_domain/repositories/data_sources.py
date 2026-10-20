"""
Simple Domain — Repositorio de Fuentes de Datos
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from simple_domain.storage.json_store import JsonStore

ALLOWED_FORMATS = {"csv", "json", "xlsx"}
ALLOWED_STATUSES = {"registered", "available", "unavailable", "error"}


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_location(location: Optional[str]) -> None:
    if not location:
        return
    # Prevenir directory traversal deliberado
    if ".." in location or "\0" in location:
        raise ValueError("Ruta de ubicación no válida o sospechosa (directory traversal prohibido).")


class DataSourceRepository:
    """Repositorio para gestionar el catálogo de fuentes de datos."""

    def __init__(self, store: JsonStore | str | Path):
        if isinstance(store, (str, Path)):
            self.store = JsonStore(store, default_factory=list)
        else:
            self.store = store

    def list_all(self, format_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        items = self.store.read()
        if not isinstance(items, list):
            items = []
        if format_filter:
            return [x for x in items if x.get("format") == format_filter]
        return list(items)

    def get_by_id(self, source_id: str) -> Optional[Dict[str, Any]]:
        for x in self.list_all():
            if x.get("id") == source_id:
                return x
        return None

    def create(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        items = self.list_all()
        now = _utcnow_iso()
        record_id = payload.get("id") or f"src_{uuid.uuid4().hex[:8]}"
        
        if any(x.get("id") == record_id for x in items):
            raise ValueError(f"Ya existe una fuente de datos con id '{record_id}'")

        fmt = str(payload.get("format", "csv")).lower()
        if fmt not in ALLOWED_FORMATS:
            raise ValueError(f"Formato no permitido: '{fmt}'. Permitidos: {ALLOWED_FORMATS}")

        location = payload.get("location")
        _validate_location(location)

        status = payload.get("status", "registered")
        if status not in ALLOWED_STATUSES:
            raise ValueError(f"Estado no permitido: '{status}'. Permitidos: {ALLOWED_STATUSES}")

        record: Dict[str, Any] = {
            "id": record_id,
            "name": str(payload.get("name", "")).strip(),
            "format": fmt,
            "description": payload.get("description"),
            "location": location,
            "status": status,
            "created_at": now,
            "updated_at": now,
            "metadata": payload.get("metadata") or {},
        }
        items.append(record)
        self.store.write(items)
        return record

    def update(self, source_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        items = self.list_all()
        for i, x in enumerate(items):
            if x.get("id") == source_id:
                if "format" in updates:
                    fmt = str(updates["format"]).lower()
                    if fmt not in ALLOWED_FORMATS:
                        raise ValueError(f"Formato no permitido: '{fmt}'")
                    x["format"] = fmt

                if "status" in updates:
                    status = str(updates["status"])
                    if status not in ALLOWED_STATUSES:
                        raise ValueError(f"Estado no permitido: '{status}'")
                    x["status"] = status

                if "location" in updates:
                    _validate_location(updates["location"])
                    x["location"] = updates["location"]

                for field in ("name", "description", "metadata"):
                    if field in updates:
                        x[field] = updates[field]

                x["updated_at"] = _utcnow_iso()
                items[i] = x
                self.store.write(items)
                return x
        return None

    def delete(self, source_id: str) -> bool:
        items = self.list_all()
        initial_len = len(items)
        filtered = [x for x in items if x.get("id") != source_id]
        if len(filtered) < initial_len:
            self.store.write(filtered)
            return True
        return False
