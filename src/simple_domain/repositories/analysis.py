"""
Simple Domain — Repositorio de Análisis de Archivos
Persistencia JSON atómica de resultados producidos por Brain.
"""

from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid
from simple_domain.storage.json_store import JsonStore


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class AnalysisRepository:
    """Repositorio para consultar y almacenar resultados de análisis de Brain."""

    def __init__(self, store: JsonStore | str | Path):
        if isinstance(store, (str, Path)):
            self.store = JsonStore(store, default_factory=list)
        else:
            self.store = store

    def list_all(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        items = self.store.read()
        if not isinstance(items, list):
            items = []
        # Más recientes primero
        sorted_items = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        return sorted_items[skip : skip + limit]

    def get_by_id(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        items = self.store.read()
        if not isinstance(items, list):
            return None
        for item in items:
            if item.get("id") == analysis_id:
                return item
        return None

    def save(
        self,
        filename: str,
        format_type: str,
        result_dict: Dict[str, Any],
        summary: Dict[str, Any],
        warnings: List[str],
    ) -> Dict[str, Any]:
        items = self.store.read()
        if not isinstance(items, list):
            items = []

        record_id = f"ana_{uuid.uuid4().hex[:8]}"
        now = _utcnow_iso()

        record: Dict[str, Any] = {
            "id": record_id,
            "filename": filename,
            "format": format_type,
            "status": "completed",
            "created_at": now,
            "summary": summary,
            "result": result_dict,
            "warnings": warnings,
        }

        items.append(record)
        self.store.write(items)
        return record

    def delete(self, analysis_id: str) -> bool:
        items = self.store.read()
        if not isinstance(items, list):
            return False
        initial_len = len(items)
        filtered = [x for x in items if x.get("id") != analysis_id]
        if len(filtered) < initial_len:
            self.store.write(filtered)
            return True
        return False
