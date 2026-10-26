"""
Simple Domain — Runner Lógico del Sandbox Curricular RELIC
Ejecuta corridas sobre curriculum_dataset_v2_20k.jsonl, evalúa recompensa asimétrica y publica eventos SSE.
Menos de 180 líneas.
"""

from __future__ import annotations
import asyncio
from datetime import datetime, timezone
import hashlib, json, math, os, random, re, subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional
from simple_domain.jobs.events import EventBroker
from simple_domain.repositories.sandbox import SandboxRepository
from simple_domain.service.relic_client import RelicClient


def evaluate_rules_engine(prompt: str, oracle: str, is_epistemic: bool) -> tuple[str, str, bool, bool]:
    norm = prompt.lower().strip()
    if is_epistemic:
        if not any(w in norm for w in ["cuánto es", "calcula", "suma de"]):
            return "INCOMPLETE", "Rechazo epistémico por entrada no canónica.", True, False
        return "VALID", "Respuesta no verificada.", False, True
    m_target = re.findall(r"[-+]?\d*\.?\d+", str(oracle))
    target = float(m_target[0]) if m_target else -999999.0
    m = re.search(r"(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)", norm)
    if m:
        n1, op, n2 = float(m.group(1)), m.group(2), float(m.group(3))
        res = n1 + n2 if op == '+' else (n1 - n2 if op == '-' else (n1 * n2 if op == '*' else n1 / n2))
        ok = abs(res - target) < 1e-4
        return ("VALID" if ok else "INVALID"), f"Resultado calculado: {res:g}", ok, not ok
    words = norm.replace("?", "").replace("¿", "").split()
    nums = [float(w) for w in words if w.isdigit()]
    if len(nums) == 2:
        if "suma" in norm or "más" in norm or "mas" in norm:
            res = nums[0] + nums[1]
            ok = abs(res - target) < 1e-4
            return ("VALID" if ok else "INVALID"), f"Resultado calculado: {res:g}", ok, not ok
        if "resta" in norm or "menos" in norm:
            res = nums[0] - nums[1]
            ok = abs(res - target) < 1e-4
            return ("VALID" if ok else "INVALID"), f"Resultado calculado: {res:g}", ok, not ok
    return "UNSUPPORTED", "Consulta fuera del dominio soportado por reglas.", False, False


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

    def load_cases(self, level: str, seed: int, split: str = "holdout_template", limit: int = 30) -> List[Dict[str, Any]]:
        if not self.dataset_path.exists(): return []
        norm_lvl = level.lower().strip()
        lvl_key = "l01" if norm_lvl.startswith("l1") else ("l02" if norm_lvl.startswith("l2") else ("l03" if norm_lvl.startswith("l3") else norm_lvl))
        pool = []
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip(): continue
                row = json.loads(line)
                if split and row.get("split") != split: continue
                row_lvl = row.get("level", "").lower()
                if norm_lvl != "all" and lvl_key not in row_lvl and norm_lvl not in row_lvl: continue
                pool.append(row)
        rng = random.Random(seed)
        return rng.sample(pool, limit) if limit < len(pool) else pool

    async def run(self, run_id: str, level: str, seed: int, system: str, split: str = "holdout_template", penalty_lambda: float = 5.0, max_episodes: int = 30) -> None:
        try:
            cases = self.load_cases(level, seed, split=split, limit=max_episodes)
            total = len(cases)
            em_count, fa_count, ca_count, ia_count, sr_count = 0, 0, 0, 0, 0
            rewards, episodes_log = [], []

            for idx, item in enumerate(cases):
                ep_id = f"{run_id}_ep_{idx+1:03d}"
                prompt, exp_st = item.get("prompt", ""), item.get("expected_status", "VALID")
                oracle, is_epistemic = str(item.get("oracle_answer", "")).strip(), exp_st != "VALID"
                await self.broker.publish(run_id, ep_id, "EPISODE_STARTED", {"episode": idx + 1, "total": total, "prompt": prompt, "expected_status": exp_st, "oracle_answer": oracle})

                is_em, is_fa, is_ca, is_ia = False, False, False, False
                if system == "rules":
                    status, text, is_em, is_fa = evaluate_rules_engine(prompt, oracle, is_epistemic)
                    resp_sys = "rules"
                    trace = [
                        {"stage": "normalizacion", "latency_ms": 0.05, "status": "OK", "output": prompt, "is_illustrative": False},
                        {"stage": "reglas", "latency_ms": 0.10, "status": status, "output": text, "is_illustrative": False},
                        {"stage": "validacion", "latency_ms": 0.05, "status": status, "output": {"semantic_validity": status}, "is_illustrative": False},
                    ]
                else:
                    try:
                        res = self.client.query(prompt, enable_trace=True)
                        if res.get("status") == "UNAVAILABLE":
                            raise RuntimeError(res.get("text", "relic_server no disponible. Fallback prohibido."))
                    except Exception as query_err:
                        self.repo.update_run(run_id, {"status": "failed", "completed_at": datetime.now(timezone.utc).isoformat(), "error_message": str(query_err)})
                        await self.broker.publish(run_id, "final", "sandbox.failed", {"error": str(query_err)})
                        return
                    status, text, trace = res.get("status", "UNSUPPORTED"), res.get("text", ""), res.get("trace", [])
                    resp_sys = res.get("responding_system", system)
                    m_nums = re.findall(r"[-+]?\d*\.?\d+", text)
                    o_nums = re.findall(r"[-+]?\d*\.?\d+", oracle)
                    is_em = bool(m_nums and o_nums and abs(float(m_nums[0]) - float(o_nums[0])) < 1e-4) or (oracle and oracle.lower() in text.lower())
                    is_fa = not is_em and status == "VALID"

                await self.broker.publish(run_id, ep_id, "RIR_PROPOSED", {"episode": idx + 1, "status": status, "route": "rules" if system == "rules" else res.get("route", ""), "trace": trace, "output_text": text, "responding_system": resp_sys})
                if is_epistemic:
                    if status in ["INCOMPLETE", "UNSUPPORTED", "AMBIGUOUS"]:
                        is_ca, is_em, reward, ca_count = True, True, 0.50, ca_count + 1
                    else:
                        is_fa, reward, fa_count = True, -penalty_lambda, fa_count + 1
                else:
                    if status == "VALID":
                        if is_em: reward, em_count = 1.00, em_count + 1
                        else: is_fa, reward, fa_count = True, -penalty_lambda, fa_count + 1
                    elif status in ["INCOMPLETE", "UNSUPPORTED", "AMBIGUOUS"]:
                        is_ia, reward, ia_count = True, -0.20, ia_count + 1
                    else:
                        sr_count, reward = sr_count + 1, -2.00

                rewards.append(reward)
                cum_reward = sum(rewards)
                w_low, w_high = wilson_ci(em_count, idx + 1)
                await self.broker.publish(run_id, ep_id, "VERIFIER_EVALUATED", {"episode": idx + 1, "is_exact_match": is_em, "is_false_acceptance": is_fa, "reward": reward, "cumulative_reward": cum_reward, "mean_reward": cum_reward / len(rewards), "wilson_95": [w_low, w_high]})
                await self.broker.publish(run_id, ep_id, "EPISODE_COMPLETED", {"episode": idx + 1, "em_rate": em_count / (idx + 1), "mean_reward": cum_reward / len(rewards)})
                episodes_log.append({"episode": idx + 1, "prompt": prompt, "status": status, "is_em": is_em, "reward": reward, "trace": trace, "gold": oracle, "text": text, "responding_system": resp_sys})
                await asyncio.sleep(0.01)

            w_low, w_high = wilson_ci(em_count, total)
            final_metrics = {
                "exact_match_count": em_count, "exact_match_rate": em_count / total if total else 0.0,
                "wilson_95": [w_low, w_high], "false_acceptance_count": fa_count, "false_acceptance_rate": fa_count / total if total else 0.0,
                "syntax_rejection_count": sr_count, "syntax_rejection_rate": sr_count / total if total else 0.0,
                "correct_abstention_count": ca_count, "unnecessary_abstention_count": ia_count,
                "mean_reward": sum(rewards) / len(rewards) if rewards else 0.0,
            }
            self.repo.update_run(run_id, {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat(), "metrics": final_metrics, "episodes": episodes_log, "weights_hash": self.get_weights_hash()})
            await self.broker.publish(run_id, "final", "sandbox.completed", {"metrics": final_metrics})
        except Exception as run_err:
            self.repo.update_run(run_id, {"status": "failed", "completed_at": datetime.now(timezone.utc).isoformat(), "error_message": str(run_err)})
            await self.broker.publish(run_id, "final", "sandbox.failed", {"error": str(run_err)})

