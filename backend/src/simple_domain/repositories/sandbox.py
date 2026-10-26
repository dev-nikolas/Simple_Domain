"""
Simple Domain — Repositorio de Sandbox Runs (/v1/sandbox/runs)
Gestiona persistencia de corridas, métricas y eventos en JSON.
Menos de 180 líneas.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import uuid
from simple_domain.storage.json_store import JsonStore

RUN_ID_REGEX = re.compile(r"^sb_[a-f0-9]{8}$")


class SandboxRepository:
    def __init__(self, base_storage_dir: str | Path):
        self.base_dir = Path(base_storage_dir).resolve()
        self.sandbox_dir = self.base_dir / "sandbox_runs"
        self.sandbox_dir.mkdir(parents=True, exist_ok=True)
        self.index_store = JsonStore(self.base_dir / "sandbox_runs.json", default_factory=list)

    def _run_dir(self, run_id: str, create: bool = False) -> Optional[Path]:
        if not RUN_ID_REGEX.match(run_id):
            return None
        p = (self.sandbox_dir / run_id).resolve()
        # Prevenir path traversal
        if not str(p).startswith(str(self.sandbox_dir)):
            return None
        if create:
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
        split: str = "holdout_template",
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        run_id = f"sb_{uuid.uuid4().hex[:8]}"

        run_manifest = {
            "id": run_id,
            "level": level,
            "seed": seed,
            "system": system,
            "split": split,
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
                "syntax_rejection_count": 0,
                "correct_abstention_count": 0,
                "unnecessary_abstention_count": 0,
                "mean_reward": 0.0,
            },
            "episodes": [],
        }

        rdir = self._run_dir(run_id, create=True)
        assert rdir is not None
        JsonStore(rdir / "manifest.json", default_factory=dict).write(run_manifest)
        (rdir / "events.jsonl").touch(exist_ok=True)

        idx = self.index_store.read()
        idx.insert(0, run_manifest)
        self.index_store.write(idx)
        return run_manifest

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        rdir = self._run_dir(run_id, create=False)
        if not rdir or not rdir.exists():
            return None
        p = rdir / "manifest.json"
        if not p.exists():
            return None
        return JsonStore(p, default_factory=dict).read()

    def update_run(self, run_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        manifest = self.get_run(run_id)
        if not manifest:
            return None
        manifest.update(updates)
        rdir = self._run_dir(run_id, create=False)
        if rdir and rdir.exists():
            JsonStore(rdir / "manifest.json", default_factory=dict).write(manifest)

        idx = self.index_store.read()
        for i, item in enumerate(idx):
            if item.get("id") == run_id:
                idx[i].update(updates)
                break
        self.index_store.write(idx)
        return manifest

    def append_event(self, run_id: str, event: Dict[str, Any]) -> None:
        rdir = self._run_dir(run_id, create=False)
        if not rdir or not rdir.exists():
            return
        p = rdir / "events.jsonl"
        with open(p, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")

    def get_events(self, run_id: str) -> List[Dict[str, Any]]:
        rdir = self._run_dir(run_id, create=False)
        if not rdir or not rdir.exists():
            return []
        jl_path = rdir / "events.jsonl"
        if jl_path.exists():
            evts = []
            with open(jl_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        evts.append(json.loads(line))
            return evts
        legacy = rdir / "events.json"
        if legacy.exists():
            return JsonStore(legacy, default_factory=list).read()
        return []

    def list_runs(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        idx = self.index_store.read()
        return idx[skip : skip + limit]

