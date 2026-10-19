"""
Simple Domain — Repositorio de Patrones
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from simple_domain.storage.json_store import JsonStore

ALLOWED_PATTERN_TYPES = {
    "relational_bivariate",
    "univariate_frequency",
    "cluster",
    "sequence",
    "custom",
}
ALLOWED_STATUSES = {"registered", "active", "archived"}
ALLOWED_ORIGINS = {"manual", "engine"}


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PatternRepository:
    """Repositorio para gestionar el catálogo de patrones descubiertos o registrados."""

    def __init__(self, store: JsonStore | str | Path):
        if isinstance(store, (str, Path)):
            self.store = JsonStore(store, default_factory=list)
        else:
            self.store = store

    def list_all(self, pattern_type: Optional[str] = None) -> List[Dict[str, Any]]:
        items = self.store.read()
        if not isinstance(items, list):
            items = []
        if pattern_type:
            return [x for x in items if x.get("pattern_type") == pattern_type]
        return list(items)

    def get_by_id(self, pattern_id: str) -> Optional[Dict[str, Any]]:
        for x in self.list_all():
            if x.get("id") == pattern_id:
                return x
        return None

    def create(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        items = self.list_all()
        now = _utcnow_iso()
        record_id = payload.get("id") or f"pat_{uuid.uuid4().hex[:8]}"

        if any(x.get("id") == record_id for x in items):
            raise ValueError(f"Ya existe un patrón con id '{record_id}'")

        ptype = payload.get("pattern_type", "custom")
        if ptype not in ALLOWED_PATTERN_TYPES:
            raise ValueError(f"Tipo de patrón no permitido: '{ptype}'. Permitidos: {ALLOWED_PATTERN_TYPES}")

        status = payload.get("status", "registered")
        if status not in ALLOWED_STATUSES:
            raise ValueError(f"Estado no permitido: '{status}'. Permitidos: {ALLOWED_STATUSES}")

        origin = payload.get("origin", "manual")
        if origin not in ALLOWED_ORIGINS:
            raise ValueError(f"Origen no permitido: '{origin}'. Permitidos: {ALLOWED_ORIGINS}")

        record: Dict[str, Any] = {
            "id": record_id,
            "name": str(payload.get("name", "")).strip(),
            "description": payload.get("description"),
            "pattern_type": ptype,
            "source_id": payload.get("source_id"),
            "status": status,
            "origin": origin,
            "created_at": now,
            "updated_at": now,
            "metadata": payload.get("metadata") or {},
        }
        items.append(record)
        self.store.write(items)
        return record

    def update(self, pattern_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        items = self.list_all()
        for i, x in enumerate(items):
            if x.get("id") == pattern_id:
                if "pattern_type" in updates:
                    ptype = updates["pattern_type"]
                    if ptype not in ALLOWED_PATTERN_TYPES:
                        raise ValueError(f"Tipo no permitido: '{ptype}'")
                    x["pattern_type"] = ptype

                if "status" in updates:
                    status = updates["status"]
                    if status not in ALLOWED_STATUSES:
                        raise ValueError(f"Estado no permitido: '{status}'")
                    x["status"] = status

                for field in ("name", "description", "source_id", "metadata"):
                    if field in updates:
                        x[field] = updates[field]

                x["updated_at"] = _utcnow_iso()
                items[i] = x
                self.store.write(items)
                return x
        return None

    def delete(self, pattern_id: str) -> bool:
        items = self.list_all()
        initial_len = len(items)
        filtered = [x for x in items if x.get("id") != pattern_id]
        if len(filtered) < initial_len:
            self.store.write(filtered)
            return True
        return False
