"""
Simple Domain — Cliente de Integración con el Motor RELIC
Permite delegar consultas de lenguaje, aritmética, grafos y razonamiento relacional a RELIC.
"""

from __future__ import annotations
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from typing import Any, Dict

DEFAULT_RELIC_SERVER_URL = os.environ.get("RELIC_SERVER_URL", "http://127.0.0.1:5000")


class RelicClient:
    def __init__(self, server_url: str = DEFAULT_RELIC_SERVER_URL):
        self.server_url = server_url.rstrip("/")

    def query(self, query_text: str, enable_trace: bool = False, allow_fallback: bool = False) -> Dict[str, Any]:
        """Envía una consulta a relic_server vía HTTP. Prohíbe fallback silencioso salvo que se requiera explícitamente."""
        try:
            req_data = json.dumps({"query": query_text, "enable_trace": enable_trace}).encode("utf-8")
            req = urllib.request.Request(
                f"{self.server_url}/api/query",
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    data["responding_system"] = "relic_server"
                    return data
        except Exception as e:
            if allow_fallback:
                return self._query_cli_fallback(query_text, enable_trace=enable_trace)
            return {
                "text": f"Error 503: relic_server no disponible en {self.server_url} ({str(e)}). Fallback silencioso prohibido.",
                "route": "client_error",
                "status": "UNAVAILABLE",
                "latency_ms": 0.0,
                "rss_mb": 0.0,
                "trace": [],
                "responding_system": "none",
            }

    def _query_cli_fallback(self, query_text: str, enable_trace: bool = False) -> Dict[str, Any]:
        """Ejecuta relic_cli directamente en local si el servidor HTTP está inactivo."""
        relic_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "RELIC")
        )
        if not os.path.isdir(relic_dir):
            return {
                "text": f"Error: No se pudo conectar con relic_server ({self.server_url}) y la ruta RELIC no fue localizada.",
                "route": "client_error",
                "status": "UNAVAILABLE",
                "latency_ms": 0.0,
                "rss_mb": 0.0,
                "trace": [],
            }

        try:
            t0 = time.perf_counter()
            cmd = ["cargo", "run", "--quiet", "--bin", "relic_cli", "--", "query", query_text]
            proc = subprocess.run(
                cmd,
                cwd=relic_dir,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=15,
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000
            stdout = proc.stdout.strip()
            resp_text = stdout
            status = "VALID"
            if "[2. ESTADO]:" in stdout:
                st_part = stdout.split("[2. ESTADO]:")[1].split()[0]
                status = st_part.strip()
            if "[3. RESPUESTA VERIFICADA]:" in stdout:
                parts = stdout.split("[3. RESPUESTA VERIFICADA]:")
                resp_text = parts[1].split("------------------------------------------------------------")[0].strip()

            trace = []
            if enable_trace:
                trace = [
                    {"stage": "normalizacion", "latency_ms": elapsed_ms * 0.15, "output": f"Normalización CLI para '{query_text[:20]}...'", "is_illustrative": True},
                    {"stage": "intencion", "latency_ms": elapsed_ms * 0.25, "output": "Intención deducida por CLI", "is_illustrative": True},
                    {"stage": "rir", "latency_ms": elapsed_ms * 0.20, "output": "RIR sintáctico generado por CLI", "is_illustrative": True},
                    {"stage": "validacion", "latency_ms": elapsed_ms * 0.10, "output": f"Esquema semántico: {status}", "is_illustrative": True},
                    {"stage": "ejecucion", "latency_ms": elapsed_ms * 0.30, "output": resp_text, "is_illustrative": False},
                ]

            return {
                "text": resp_text,
                "route": "relic_cli_direct",
                "status": status,
                "latency_ms": round(elapsed_ms, 2),
                "rss_mb": 0.0,
                "trace": trace,
                "responding_system": "relic_cli_direct",
            }
        except Exception as e:
            return {
                "text": f"Error al ejecutar RELIC: {str(e)}",
                "route": "client_error",
                "status": "ERROR",
                "latency_ms": 0.0,
                "rss_mb": 0.0,
            }
