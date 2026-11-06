#!/usr/bin/env python3
"""
Simple Domain — Runner Multi-Plataforma Unificado (Windows / Linux / macOS)
Inicia y monitoriza los 4 servicios concurrentemente mostrando un dashboard de 4 paneles en terminal:
  1. Motor LLM (llama-server :8081)
  2. Microkernel RELIC Server (Rust :5000)
  3. Agentic Gateway & MCP (Node.js :4000)
  4. Frontend UI (React/Vite :5173)

No requiere dependencias externas; funciona con la biblioteca estándar de Python.
"""

import io
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import deque
from pathlib import Path
from typing import Any

# Habilitar UTF-8 y colores ANSI en Windows
if sys.platform == "win32":
    os.system("")
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, io.UnsupportedOperation):
        pass

# Raíz del proyecto (donde reside este script)
PROJECT_ROOT = Path(__file__).resolve().parent

# Configuración de los 4 servicios
SERVICES: list[dict[str, Any]] = [
    {
        "id": "llm",
        "name": "1. Motor LLM (Dolphin 3B)",
        "port": 8081,
        "color": "\033[96m",  # Cyan
    },
    {
        "id": "relic",
        "name": "2. Microkernel RELIC (Rust)",
        "port": 5000,
        "color": "\033[92m",  # Verde
    },
    {
        "id": "gateway",
        "name": "3. Agentic Gateway & MCP",
        "port": 4000,
        "color": "\033[93m",  # Amarillo
    },
    {
        "id": "frontend",
        "name": "4. Frontend Web UI (React)",
        "port": 5173,
        "color": "\033[95m",  # Magenta
    },
]

# Buffers circulares de logs para cada panel
LOG_BUFFERS: dict[str, deque] = {s["id"]: deque(maxlen=200) for s in SERVICES}
STATUS: dict[str, str] = {s["id"]: "Iniciando..." for s in SERVICES}
PROCESSES: list[subprocess.Popen] = []
STOP_EVENT = threading.Event()
LOCK = threading.Lock()


def log_line(service_id: str, line: str) -> None:
    clean = line.rstrip("\r\n")
    if not clean:
        return
    with LOCK:
        LOG_BUFFERS[service_id].append(clean)


def check_and_download_model() -> bool:
    model_dir = PROJECT_ROOT / "llm_server"
    model_path = model_dir / "dolphin-2.9.4-llama3.2-3b-q4_k_m.gguf"
    if model_path.exists() and model_path.stat().st_size > 1024 * 1024:
        return True

    log_line("llm", "[INIT] Modelo Dolphin 3B no encontrado en disco.")
    log_line("llm", "[INIT] Descargando desde Hugging Face (~2.02 GB)...")
    url = (
        "https://huggingface.co/bartowski/Dolphin3.0-Llama3.2-3B-GGUF"
        "/resolve/main/Dolphin3.0-Llama3.2-3B-Q4_K_M.gguf"
    )

    try:

        def reporthook(block_num: int, block_size: int, total_size: int) -> None:
            if total_size > 0 and block_num % 1000 == 0:
                downloaded = block_num * block_size
                pct = min(100.0, (downloaded / total_size) * 100.0)
                mb = downloaded / (1024 * 1024)
                total_mb = total_size / (1024 * 1024)
                log_line("llm", f"Descargando: {pct:.1f}% ({mb:.1f}/{total_mb:.1f} MB)")

        urllib.request.urlretrieve(url, str(model_path), reporthook=reporthook)
        log_line("llm", "[OK] Modelo descargado exitosamente.")
        return True
    except (urllib.error.URLError, OSError) as err:
        log_line("llm", f"[ERROR] No se pudo descargar el modelo: {err}")
        return False


def run_llm() -> None:
    service_id = "llm"
    model_path = PROJECT_ROOT / "llm_server" / "dolphin-2.9.4-llama3.2-3b-q4_k_m.gguf"

    if not model_path.exists():
        check_and_download_model()

    exe_candidates = [
        PROJECT_ROOT
        / "llm_server"
        / ("llama-server.exe" if os.name == "nt" else "llama-server"),
        shutil.which("llama-server"),
        shutil.which("llama-server.exe"),
    ]
    llama_exe = next(
        (str(p) for p in exe_candidates if p and os.path.exists(str(p))), None
    )

    if not llama_exe:
        STATUS[service_id] = "Omitido (sin llama-server local)"
        log_line(
            service_id, "[INFO] llama-server no encontrado en PATH ni en llm_server/."
        )
        log_line(
            service_id, "[INFO] Si ejecutas con Docker, el motor corre automáticamente."
        )
        return

    cmd = [
        llama_exe,
        "-m",
        str(model_path),
        "-c",
        "2048",
        "-t",
        "2",
        "-ngl",
        "0",
        "--host",
        "127.0.0.1",
        "--port",
        "8081",
        "--flash-attn",
        "off",
    ]
    spawn_and_stream(service_id, cmd, cwd=PROJECT_ROOT / "llm_server")


def run_relic() -> None:
    service_id = "relic"
    cargo = shutil.which("cargo")
    if not cargo:
        STATUS[service_id] = "Error (Cargo no encontrado)"
        log_line(service_id, "[ERROR] Rust/Cargo no está instalado en el sistema.")
        return

    cmd = [cargo, "run", "--release", "-p", "relic_server"]
    spawn_and_stream(service_id, cmd, cwd=PROJECT_ROOT / "relic")


def run_gateway() -> None:
    service_id = "gateway"
    node = shutil.which("node")
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    gateway_dir = PROJECT_ROOT / "llm_server" / "agentic_gateway"

    if not node:
        STATUS[service_id] = "Error (Node no encontrado)"
        log_line(service_id, "[ERROR] Node.js no está instalado en el sistema.")
        return

    # Verificar si faltan dependencias node_modules
    if not (gateway_dir / "node_modules").exists() and npm:
        STATUS[service_id] = "npm install..."
        log_line(service_id, "[SETUP] Instalando dependencias del Gateway...")
        try:
            subprocess.run([npm, "install", "--silent"], cwd=gateway_dir, check=False)
        except OSError as err:
            log_line(service_id, f"[WARN] npm install fallo: {err}")

    env = os.environ.copy()
    env["PORT"] = "4000"
    env["LLAMA_URL"] = "http://127.0.0.1:8081/v1/chat/completions"
    env["RELIC_SERVER_URL"] = "http://127.0.0.1:5000"

    cmd = [node, "server.mjs"]
    spawn_and_stream(service_id, cmd, cwd=gateway_dir, env=env)


def run_frontend() -> None:
    service_id = "frontend"
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    frontend_dir = PROJECT_ROOT / "frontend"

    if not npm:
        STATUS[service_id] = "Error (npm no encontrado)"
        log_line(service_id, "[ERROR] npm no está disponible en el sistema.")
        return

    # Verificar si faltan dependencias node_modules
    if not (frontend_dir / "node_modules").exists():
        STATUS[service_id] = "npm install..."
        log_line(
            service_id, "[SETUP] Instalando dependencias de React (npm install)..."
        )
        try:
            subprocess.run([npm, "install", "--silent"], cwd=frontend_dir, check=False)
        except OSError as err:
            log_line(service_id, f"[WARN] npm install: {err}")

    cmd = [npm, "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"]
    spawn_and_stream(service_id, cmd, cwd=frontend_dir)


def spawn_and_stream(
    service_id: str,
    cmd: list[str],
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
) -> None:
    STATUS[service_id] = "Ejecutando"
    log_line(service_id, f"[START] {' '.join(str(c) for c in cmd)}")
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=str(cwd) if cwd else None,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            encoding="utf-8",
            errors="replace",
        )
        PROCESSES.append(proc)
        if proc.stdout:
            for line in iter(proc.stdout.readline, ""):
                if STOP_EVENT.is_set():
                    break
                log_line(service_id, line)
            proc.stdout.close()
        proc.wait()
        STATUS[service_id] = f"Finalizado ({proc.returncode})"
    except OSError as err:
        STATUS[service_id] = "Error"
        log_line(service_id, f"[EXCEPCION] {err}")


def render_dashboard() -> None:
    clear_screen = "\033[2J\033[H"
    reset_color = "\033[0m"
    bold = "\033[1m"
    dim = "\033[2m"

    while not STOP_EVENT.is_set():
        cols, rows = shutil.get_terminal_size(fallback=(100, 30))
        cols = max(cols, 60)
        rows = max(rows, 16)

        half_w = max(28, (cols - 3) // 2)
        total_w = half_w * 2 + 3

        # Altura de líneas de logs por panel
        panel_h = max(3, (rows - 6) // 2)

        out: list[str] = [clear_screen]

        # Encabezado principal
        title = " SIMPLE DOMAIN - 4 SERVICIOS CONCURRENTES "
        bar = "=" * max(0, (total_w - len(title)) // 2)
        out.append(f"{bold}\033[94m{bar}{title}{bar}{reset_color}\n")

        def pad_box(text: str, w: int) -> str:
            clean = text[: w - 1] if len(text) > w else text
            return clean + (" " * (w - len(clean)))

        # Paneles superiores: LLM y RELIC | Paneles inferiores: Gateway y Frontend
        pairs = [
            (SERVICES[0], SERVICES[1]),
            (SERVICES[2], SERVICES[3]),
        ]

        for s1, s2 in pairs:
            title1 = f"|-- {s1['name']} [{STATUS[s1['id']]}] "
            title2 = f"|-- {s2['name']} [{STATUS[s2['id']]}] "

            border1 = title1 + ("-" * max(0, half_w - len(title1))) + "+"
            border2 = title2 + ("-" * max(0, half_w - len(title2))) + "+"
            out.append(
                f"{s1['color']}{bold}{border1}{reset_color} | "
                f"{s2['color']}{bold}{border2}{reset_color}\n"
            )

            with LOCK:
                logs1 = list(LOG_BUFFERS[s1["id"]])[-panel_h:]
                logs2 = list(LOG_BUFFERS[s2["id"]])[-panel_h:]

            logs1 = [""] * (panel_h - len(logs1)) + logs1
            logs2 = [""] * (panel_h - len(logs2)) + logs2

            for l1, l2 in zip(logs1, logs2):
                col1 = pad_box(l1, half_w - 2)
                col2 = pad_box(l2, half_w - 2)
                out.append(
                    f"{s1['color']}|{reset_color} {col1} {s1['color']}|{reset_color} | "
                    f"{s2['color']}|{reset_color} {col2} {s2['color']}|{reset_color}\n"
                )

            bot1 = "+" + ("-" * (half_w - 2)) + "+"
            bot2 = "+" + ("-" * (half_w - 2)) + "+"
            out.append(
                f"{s1['color']}{bot1}{reset_color} | {s2['color']}{bot2}{reset_color}\n"
            )

        out.append(
            f"{dim}URLs: UI: http://localhost:5173 | Gateway: :4000 | "
            f"RELIC: :5000 | LLM: :8081  (Ctrl+C para salir){reset_color}\n"
        )

        try:
            sys.stdout.write("".join(out))
            sys.stdout.flush()
        except OSError:
            pass

        time.sleep(0.5)


def cleanup(sig: int | None = None, frame: Any = None) -> None:
    STOP_EVENT.set()
    sys.stdout.write("\n\033[0mDeteniendo los 4 servicios de Simple Domain...\n")
    sys.stdout.flush()
    for proc in PROCESSES:
        try:
            if proc.poll() is None:
                if os.name == "nt":
                    proc.terminate()
                else:
                    proc.send_signal(signal.SIGTERM)
        except OSError:
            pass
    time.sleep(1)
    for proc in PROCESSES:
        try:
            if proc.poll() is None:
                proc.kill()
        except OSError:
            pass
    sys.stdout.write("[OK] Servicios finalizados.\n")
    sys.exit(0)


def main() -> None:
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    workers = [
        threading.Thread(target=run_llm, daemon=True, name="Worker-LLM"),
        threading.Thread(target=run_relic, daemon=True, name="Worker-RELIC"),
        threading.Thread(target=run_gateway, daemon=True, name="Worker-Gateway"),
        threading.Thread(target=run_frontend, daemon=True, name="Worker-Frontend"),
    ]
    for w in workers:
        w.start()

    render_thread = threading.Thread(
        target=render_dashboard, daemon=True, name="Dashboard"
    )
    render_thread.start()

    try:
        while not STOP_EVENT.is_set():
            time.sleep(0.5)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
