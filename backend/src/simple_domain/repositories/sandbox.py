"""
Simple Domain — Repositorio de Sandbox Runs (/v1/sandbox/runs)
Gestiona persistencia de corridas, métricas y eventos en JSON.
Menos de 180 líneas.
"""

from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid
from simple_domain.storage.json_store import JsonStore


class SandboxRepository:
    def __init__(self, base_storage_dir: str | Path):
        self.base_dir = Path(base_storage_dir).resolve()
        self.sandbox_dir = self.base_dir / "sandbox_runs"
        self.sandbox_dir.mkdir(parents=True, exist_ok=True)
        self.index_store = JsonStore(self.base_dir / "sandbox_runs.json", default_factory=list)

    def _run_dir(self, run_id: str) -> Path:
        p = self.sandbox_dir / run_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def create_run(
        self,
        level: str,
        seed: int,
        system: str,
        penalty_lambda: float,
        commit_hash: str,
        dataset_hash: str,
        weights_hash: str,
        total_episodes: int,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        run_id = f"sb_{uuid.uuid4().hex[:8]}"

        run_manifest = {
            "id": run_id,
            "level": level,
            "seed": seed,
            "system": system,
            "penalty_lambda": penalty_lambda,
            "commit": commit_hash,
            "dataset_hash": dataset_hash,
            "weights_hash": weights_hash,
            "total_episodes": total_episodes,
            "status": "running",
            "created_at": now,
            "completed_at": None,
            "metrics": {
                "exact_match_count": 0,
                "exact_match_rate": 0.0,
                "wilson_95": [0.0, 1.0],
                "false_acceptance_count": 0,
                "false_acceptance_rate": 0.0,
                "correct_abstention_count": 0,
                "unnecessary_abstention_count": 0,
                "mean_reward": 0.0,
            },
            "episodes": [],
        }

        rdir = self._run_dir(run_id)
        JsonStore(rdir / "manifest.json", default_factory=dict).write(run_manifest)
        JsonStore(rdir / "events.json", default_factory=list).write([])

        idx = self.index_store.read()
        idx.insert(0, run_manifest)
        self.index_store.write(idx)
        return run_manifest

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        p = self._run_dir(run_id) / "manifest.json"
        if not p.exists():
            return None
        return JsonStore(p, default_factory=dict).read()

    def update_run(self, run_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        manifest = self.get_run(run_id)
        if not manifest:
            return None
        manifest.update(updates)
        JsonStore(self._run_dir(run_id) / "manifest.json", default_factory=dict).write(manifest)

        idx = self.index_store.read()
        for i, item in enumerate(idx):
            if item.get("id") == run_id:
                idx[i].update(updates)
                break
        self.index_store.write(idx)
        return manifest

    def append_event(self, run_id: str, event: Dict[str, Any]) -> None:
        p = self._run_dir(run_id) / "events.json"
        store = JsonStore(p, default_factory=list)
        evts = store.read()
        evts.append(event)
        store.write(evts)

    def get_events(self, run_id: str) -> List[Dict[str, Any]]:
        p = self._run_dir(run_id) / "events.json"
        if not p.exists():
            return []
        return JsonStore(p, default_factory=list).read()

    def list_runs(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        idx = self.index_store.read()
        return idx[skip : skip + limit]
