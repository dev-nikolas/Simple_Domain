"""
Simple Domain — Gestor de Eventos y Streaming SSE (Server-Sent Events)
Soporta publicación en tiempo real, persistencia y repetición con Last-Event-ID.
"""

from __future__ import annotations
import asyncio
from datetime import datetime, timezone
import json
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional
from simple_domain.repositories.archives import ArchiveRepository

TERMINAL_EVENTS = {"archive.completed", "archive.failed"}


class EventBroker:
    def __init__(self, archive_repo: ArchiveRepository):
        self.archive_repo = archive_repo
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def publish(
        self, archive_id: str, job_id: str, event_type: str, data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        evt_id = f"evt_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": evt_id,
            "archive_id": archive_id,
            "job_id": job_id,
            "type": event_type,
            "timestamp": now,
            "data": data or {},
        }

        # Persistencia en storage/archives/{archive_id}/events.json
        self.archive_repo.append_event(archive_id, payload)

        # Entrega en memoria a suscriptores SSE activos
        async with self._lock:
            queues = self._subscribers.get(archive_id, [])
            for q in queues:
                await q.put(payload)

        return payload

    async def stream(
        self, archive_id: str, last_event_id: Optional[str] = None
    ) -> AsyncIterator[str]:
        # 1. Recuperar eventos históricos de storage
        history = self.archive_repo.get_events(archive_id)
        start_idx = 0
        if last_event_id:
            for idx, item in enumerate(history):
                if item.get("id") == last_event_id:
                    start_idx = idx + 1
                    break

        terminal_reached = False
        for evt in history[start_idx:]:
            yield f"id: {evt['id']}\nevent: {evt['type']}\ndata: {json.dumps(evt, ensure_ascii=False)}\n\n"
            if evt.get("type") in TERMINAL_EVENTS:
                terminal_reached = True

        if terminal_reached:
            return

        # 2. Suscribirse a eventos en vivo si aún no terminó
        q: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._subscribers.setdefault(archive_id, []).append(q)

        try:
            while True:
                try:
                    evt = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield f"id: {evt['id']}\nevent: {evt['type']}\ndata: {json.dumps(evt, ensure_ascii=False)}\n\n"
                    if evt.get("type") in TERMINAL_EVENTS:
                        break
                except asyncio.TimeoutError:
                    # Keep-alive SSE ping
                    yield ": ping\n\n"
        finally:
            async with self._lock:
                if archive_id in self._subscribers and q in self._subscribers[archive_id]:
                    self._subscribers[archive_id].remove(q)
                    if not self._subscribers[archive_id]:
                        del self._subscribers[archive_id]
