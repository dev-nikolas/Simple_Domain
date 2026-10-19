"""
Simple Domain — Coordinador Asíncrono de Trabajos (JobCoordinator)
Máquina de estados: accepted -> queued -> validating -> normalizing -> processing -> completed/failed.
"""

from __future__ import annotations
import asyncio
import dataclasses
from pathlib import Path
from typing import Any, Dict, Optional
from simple_domain.brain import analyze_dataset
from simple_domain.jobs.events import EventBroker
from simple_domain.repositories.archives import ArchiveRepository
from simple_domain.repositories.conversations import ConversationRepository
from simple_domain.service.analysis.normalizer import normalize_csv, normalize_json


def _format_assistant_summary(filename: str, result_dict: Dict[str, Any], warnings: list[str]) -> str:
    summary = result_dict.get("summary", {})
    patterns = result_dict.get("patterns", [])
    total_series = result_dict.get("total_series_analyzed", len(patterns))

    lines = [
        f"Análisis completado para **{filename}**.",
        f"Se procesaron {summary.get('total_rows', 'N/A')} filas y {total_series} series numéricas.",
        "",
        "**Patrones numéricos identificados:**",
    ]

    for p in patterns:
        name = p.get("series_name", "desconocida")
        ptype = p.get("pattern_type", "")
        params = p.get("parameters", {})
        stats = p.get("statistics", {})

        if ptype == "arithmetic_progression":
            lines.append(f"- **{name}**: Progresión aritmética con paso `{params.get('step')}` (rango: {stats.get('min_value')} a {stats.get('max_value')}).")
        elif ptype == "constant":
            lines.append(f"- **{name}**: Secuencia constante en valor `{params.get('constant_value')}`.")
        elif ptype == "irregular_variation":
            lines.append(f"- **{name}**: Variación irregular (diferencias no constantes; media: {stats.get('mean')}).")
        elif ptype == "insufficient_data":
            lines.append(f"- **{name}**: Datos insuficientes para determinar un patrón con certeza.")

    if warnings:
        lines.append("")
        lines.append(f"*Advertencias*: {'; '.join(warnings)}")

    return "\n".join(lines)


class JobCoordinator:
    def __init__(
        self, archive_repo: ArchiveRepository, conv_repo: ConversationRepository, event_broker: EventBroker
    ):
        self.archive_repo = archive_repo
        self.conv_repo = conv_repo
        self.events = event_broker
        self._queue: asyncio.Queue = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None

    def start(self) -> None:
        try:
            loop = asyncio.get_running_loop()
            if self._worker_task is None or self._worker_task.done():
                self._worker_task = loop.create_task(self._worker_loop())
        except RuntimeError:
            pass

    def stop(self) -> None:
        if self._worker_task and not self._worker_task.done():
            self._worker_task.cancel()

    async def enqueue(
        self, archive_id: str, job_id: str, filename: str, ext: str, content: str, conv_id: Optional[str]
    ) -> None:
        self.start()
        self.archive_repo.update_status(archive_id, "queued")
        await self.events.publish(archive_id, job_id, "archive.queued", {"filename": filename})
        await self._queue.put((archive_id, job_id, filename, ext, content, conv_id))

    async def _worker_loop(self) -> None:
        while True:
            job = await self._queue.get()
            try:
                await self._process_job(*job)
            except Exception as e:
                pass
            finally:
                self._queue.task_done()

    async def _process_job(
        self, archive_id: str, job_id: str, filename: str, ext: str, content: str, conv_id: Optional[str]
    ) -> None:
        try:
            # 1. Validating
            self.archive_repo.update_status(archive_id, "validating")
            await self.events.publish(archive_id, job_id, "archive.validating")
            await asyncio.sleep(0.05)

            # 2. Normalizing
            self.archive_repo.update_status(archive_id, "normalizing")
            await self.events.publish(archive_id, job_id, "archive.normalizing")
            normalized = normalize_csv(content, filename) if ext == ".csv" else normalize_json(content, filename)
            norm_dict = dataclasses.asdict(normalized)
            self.archive_repo.save_normalized(archive_id, norm_dict)
            await asyncio.sleep(0.05)

            # 3. Processing (Brain Engine)
            self.archive_repo.update_status(archive_id, "processing")
            await self.events.publish(archive_id, job_id, "archive.processing")
            brain_result = analyze_dataset(normalized)
            res_dict = dataclasses.asdict(brain_result)
            warns = normalized.warnings + brain_result.global_warnings
            self.archive_repo.save_result(archive_id, res_dict, brain_result.summary, warns)

            # 4. Actualizar conversación y generar explicación
            if conv_id:
                self.conv_repo.update_title_if_default(conv_id, f"Análisis · {filename}")
                summary_text = _format_assistant_summary(filename, res_dict, warns)
                self.conv_repo.add_message(
                    conv_id=conv_id,
                    role="assistant",
                    content=summary_text,
                    archive_id=archive_id,
                    job_id=job_id,
                    metadata={"result_summary": brain_result.summary},
                )

            # 5. Completed
            await self.events.publish(archive_id, job_id, "archive.completed", {"summary": brain_result.summary})

        except Exception as err:
            err_msg = str(err)
            self.archive_repo.update_status(archive_id, "failed", error=err_msg)
            if conv_id:
                self.conv_repo.add_message(
                    conv_id=conv_id,
                    role="assistant",
                    content=f"Error al analizar **{filename}**: {err_msg}",
                    archive_id=archive_id,
                    job_id=job_id,
                )
            await self.events.publish(archive_id, job_id, "archive.failed", {"error": err_msg})

    async def recover_unfinished_jobs(self) -> None:
        archives = self.archive_repo.list_all(skip=0, limit=100)
        for arc in archives:
            status = arc.get("status")
            if status in {"accepted", "queued", "validating", "normalizing", "processing"}:
                aid = arc["archive_id"]
                jid = arc["job_id"]
                fname = arc["filename"]
                fmt = "." + arc["format"].lower().lstrip(".")
                raw_path = self.archive_repo._archive_path(aid) / f"raw_{fname}"
                if raw_path.exists():
                    with open(raw_path, "r", encoding="utf-8", errors="replace") as f:
                        raw_content = f.read()
                    await self.enqueue(aid, jid, fname, fmt, raw_content, arc.get("conversation_id"))
                else:
                    self.archive_repo.update_status(aid, "failed", error="Interrumpido y sin archivo recuperable.")
