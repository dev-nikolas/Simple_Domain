"""
Simple Domain — Repositorio de Archivos y Ciclo de Vida (Archive)
Gestiona manifest.json, normalized.json, result.json y events.json bajo storage/archives/.
"""

from __future__ import annotations
from datetime import datetime, timezone
import os
from pathlib import Path
import uuid
from typing import Any, Dict, List, Optional, Tuple
from simple_domain.storage.json_store import JsonStore


class ArchiveRepository:
    def __init__(self, base_storage_dir: str | Path):
        self.base_dir = Path(base_storage_dir).resolve()
        self.archives_dir = self.base_dir / "archives"
        self.archives_dir.mkdir(parents=True, exist_ok=True)
        self.index_store = JsonStore(self.base_dir / "archives.json", default_factory=list)

    def _archive_path(self, archive_id: str) -> Path:
        return self.archives_dir / archive_id

    def create_archive(
        self, filename: str, format_type: str, raw_content: str, conversation_id: Optional[str] = None
    ) -> Tuple[str, str]:
        now = datetime.now(timezone.utc).isoformat()
        archive_id = f"arc_{uuid.uuid4().hex[:8]}"
        job_id = f"job_{uuid.uuid4().hex[:8]}"

        adir = self._archive_path(archive_id)
        adir.mkdir(parents=True, exist_ok=True)

        # Guardar copia del archivo original para reproducibilidad
        raw_path = adir / f"raw_{filename}"
        with open(raw_path, "w", encoding="utf-8", errors="replace") as f:
            f.write(raw_content)

        manifest = {
            "archive_id": archive_id,
            "job_id": job_id,
            "filename": filename,
            "format": format_type,
            "size_bytes": len(raw_content.encode("utf-8")),
            "status": "accepted",
            "conversation_id": conversation_id,
            "created_at": now,
            "updated_at": now,
            "error": None,
            "summary": None,
            "warnings": [],
        }

        JsonStore(adir / "manifest.json", default_factory=dict).write(manifest)
        JsonStore(adir / "events.json", default_factory=list).write([])

        # Actualizar índice
        idx = self.index_store.read()
        idx.insert(0, manifest)
        self.index_store.write(idx)

        return archive_id, job_id

    def update_status(self, archive_id: str, status: str, error: Optional[str] = None) -> None:
        adir = self._archive_path(archive_id)
        m_store = JsonStore(adir / "manifest.json", default_factory=dict)
        manifest = m_store.read()
        if manifest:
            manifest["status"] = status
            manifest["updated_at"] = datetime.now(timezone.utc).isoformat()
            if error:
                manifest["error"] = error
            m_store.write(manifest)

            idx = self.index_store.read()
            for item in idx:
                if item.get("archive_id") == archive_id:
                    item["status"] = status
                    item["updated_at"] = manifest["updated_at"]
                    if error:
                        item["error"] = error
                    break
            self.index_store.write(idx)

    def save_normalized(self, archive_id: str, normalized_dict: Dict[str, Any]) -> None:
        adir = self._archive_path(archive_id)
        JsonStore(adir / "normalized.json", default_factory=dict).write(normalized_dict)

    def save_result(
        self, archive_id: str, result_dict: Dict[str, Any], summary: Dict[str, Any], warnings: List[str]
    ) -> None:
        adir = self._archive_path(archive_id)
        JsonStore(adir / "result.json", default_factory=dict).write(result_dict)

        m_store = JsonStore(adir / "manifest.json", default_factory=dict)
        manifest = m_store.read()
        manifest["status"] = "completed"
        manifest["summary"] = summary
        manifest["warnings"] = warnings
        manifest["updated_at"] = datetime.now(timezone.utc).isoformat()
        m_store.write(manifest)

        idx = self.index_store.read()
        for item in idx:
            if item.get("archive_id") == archive_id:
                item["status"] = "completed"
                item["summary"] = summary
                item["warnings"] = warnings
                item["updated_at"] = manifest["updated_at"]
                break
        self.index_store.write(idx)

    def get_manifest(self, archive_id: str) -> Optional[Dict[str, Any]]:
        adir = self._archive_path(archive_id)
        p = adir / "manifest.json"
        if not p.exists():
            return None
        return JsonStore(p, default_factory=dict).read()

    def get_normalized(self, archive_id: str) -> Optional[Dict[str, Any]]:
        adir = self._archive_path(archive_id)
        p = adir / "normalized.json"
        return JsonStore(p, default_factory=dict).read() if p.exists() else None

    def get_result(self, archive_id: str) -> Optional[Dict[str, Any]]:
        adir = self._archive_path(archive_id)
        p = adir / "result.json"
        return JsonStore(p, default_factory=dict).read() if p.exists() else None

    def get_events(self, archive_id: str) -> List[Dict[str, Any]]:
        adir = self._archive_path(archive_id)
        p = adir / "events.json"
        return JsonStore(p, default_factory=list).read() if p.exists() else []

    def append_event(self, archive_id: str, event: Dict[str, Any]) -> None:
        adir = self._archive_path(archive_id)
        e_store = JsonStore(adir / "events.json", default_factory=list)
        events = e_store.read()
        events.append(event)
        e_store.write(events)

    def list_all(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        idx = self.index_store.read()
        return idx[skip : skip + limit]
