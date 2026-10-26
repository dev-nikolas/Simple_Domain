"""
Simple Domain — Runner Lógico del Sandbox Curricular RELIC
Ejecuta corridas sobre curriculum_dataset_v2_20k.jsonl, evalúa recompensa asimétrica y publica eventos SSE.
Menos de 180 líneas.
"""

from __future__ import annotations
import asyncio
from datetime import datetime, timezone
import hashlib, json, math, os, re, subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional
from simple_domain.jobs.events import EventBroker
from simple_domain.repositories.sandbox import SandboxRepository
from simple_domain.service.relic_client import RelicClient


def wilson_ci(k: int, n: int, z: float = 1.95996) -> tuple[float, float]:
    if n == 0: return 0.0, 1.0
    p = k / n
    denom = 1.0 + (z * z) / n
    center = (p + (z * z) / (2.0 * n)) / denom
    spread = (z * math.sqrt((p * (1.0 - p) / n) + (z * z) / (4.0 * (n * n)))) / denom
    return max(0.0, center - spread), min(1.0, center + spread)


class SandboxRunner:
    def __init__(self, sandbox_repo: SandboxRepository, event_broker: EventBroker, relic_client: Optional[RelicClient] = None):
        self.repo = sandbox_repo
        self.broker = event_broker
        self.client = relic_client or RelicClient()
        self.relic_root = Path(__file__).resolve().parents[5] / "RELIC"
        self.dataset_path = self.relic_root / "data" / "curriculum_dataset_v2_20k.jsonl"

    def get_commit_hash(self) -> str:
        try:
            p = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=str(self.relic_root), capture_output=True, text=True)
            return p.stdout.strip() or "HEAD"
        except Exception:
            return "unknown"

    def get_dataset_hash(self) -> str:
        if not self.dataset_path.exists(): return "not_found"
        h = hashlib.sha256()
        with open(self.dataset_path, "rb") as f:
            while chunk := f.read(65536): h.update(chunk)
        return h.hexdigest()

    def get_weights_hash(self) -> str:
        p = self.relic_root / "data" / "relic_10m_trained.safetensors"
        if not p.exists(): return "none"
        h = hashlib.sha256()
        with open(p, "rb") as f:
            while chunk := f.read(65536): h.update(chunk)
        return h.hexdigest()

    def load_cases(self, level: str, seed: int, limit: int = 30) -> List[Dict[str, Any]]:
        cases = []
        if not self.dataset_path.exists(): return []
        norm_lvl = level.lower().strip()
        lvl_key = "l01" if norm_lvl.startswith("l1") else ("l02" if norm_lvl.startswith("l2") else ("l03" if norm_lvl.startswith("l3") else norm_lvl))
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip(): continue
                row = json.loads(line)
                row_lvl = row.get("level", "").lower()
                if norm_lvl != "all" and lvl_key not in row_lvl and norm_lvl not in row_lvl:
                    continue
                cases.append(row)
                if len(cases) >= limit: break
        return cases

    async def run(self, run_id: str, level: str, seed: int, system: str, penalty_lambda: float = 5.0, max_episodes: int = 30) -> None:
        cases = self.load_cases(level, seed, limit=max_episodes)
        total = len(cases)
        em_count, fa_count, ca_count, ia_count = 0, 0, 0, 0
        rewards: List[float] = []
        episodes_log = []

        for idx, item in enumerate(cases):
            ep_id = f"{run_id}_ep_{idx+1:03d}"
            prompt = item.get("prompt", "")
            exp_st = item.get("expected_status", "VALID")
            oracle = str(item.get("oracle_answer", "")).strip()
            gold_rir = item.get("gold_rir", {})
            is_epistemic = exp_st != "VALID"

            await self.broker.publish(run_id, ep_id, "EPISODE_STARTED", {
                "episode": idx + 1, "total": total, "prompt": prompt, "expected_status": exp_st, "oracle_answer": oracle,
            })

            # Ejecución según sistema
            res = self.client.query(prompt, enable_trace=True)
            status = res.get("status", "UNSUPPORTED")
            text = res.get("text", "")
            trace = res.get("trace", [])

            await self.broker.publish(run_id, ep_id, "RIR_PROPOSED", {
                "episode": idx + 1, "status": status, "route": res.get("route", ""), "trace": trace, "output_text": text
            })

            # Evaluación asimétrica con lambda
            is_em, is_fa, is_ca, is_ia = False, False, False, False
            if is_epistemic:
                if status in ["INCOMPLETE", "UNSUPPORTED", "AMBIGUOUS"]:
                    is_ca = True; is_em = True; reward = 0.50; ca_count += 1
                else:
                    is_fa = True; reward = -penalty_lambda; fa_count += 1
            else:
                m_nums = re.findall(r"[-+]?\d*\.?\d+", text)
                o_nums = re.findall(r"[-+]?\d*\.?\d+", oracle)
                matched = bool(m_nums and o_nums and abs(float(m_nums[0]) - float(o_nums[0])) < 1e-4) or (oracle.lower() in text.lower())
                if status in ["INCOMPLETE", "UNSUPPORTED", "AMBIGUOUS"]:
                    is_ia = True; reward = -0.20; ia_count += 1
                elif matched:
                    is_em = True; reward = 1.00; em_count += 1
                elif "Error" in text or status == "INVALID":
                    reward = -2.00
                else:
                    reward = -penalty_lambda

            rewards.append(reward)
            cum_reward = sum(rewards)
            mean_reward = cum_reward / len(rewards)
            w_low, w_high = wilson_ci(em_count, idx + 1)

            eval_data = {
                "episode": idx + 1, "is_exact_match": is_em, "is_false_acceptance": is_fa,
                "reward": reward, "cumulative_reward": cum_reward, "mean_reward": mean_reward,
                "wilson_95": [w_low, w_high],
            }
            await self.broker.publish(run_id, ep_id, "VERIFIER_EVALUATED", eval_data)
            await self.broker.publish(run_id, ep_id, "EPISODE_COMPLETED", {
                "episode": idx + 1, "em_rate": em_count / (idx + 1), "mean_reward": mean_reward
            })

            episodes_log.append({
                "episode": idx + 1, "prompt": prompt, "status": status, "is_em": is_em,
                "reward": reward, "trace": trace, "gold": oracle, "text": text
            })
            await asyncio.sleep(0.01)

        # Cierre y persistencia de métricas
        w_low, w_high = wilson_ci(em_count, total)
        final_metrics = {
            "exact_match_count": em_count, "exact_match_rate": em_count / total if total else 0.0,
            "wilson_95": [w_low, w_high], "false_acceptance_count": fa_count,
            "false_acceptance_rate": fa_count / total if total else 0.0,
            "correct_abstention_count": ca_count, "unnecessary_abstention_count": ia_count,
            "mean_reward": sum(rewards) / len(rewards) if rewards else 0.0,
        }
        self.repo.update_run(run_id, {
            "status": "completed", "completed_at": datetime.now(timezone.utc).isoformat(),
            "metrics": final_metrics, "episodes": episodes_log
        })
        await self.broker.publish(run_id, "final", "sandbox.completed", {"metrics": final_metrics})
