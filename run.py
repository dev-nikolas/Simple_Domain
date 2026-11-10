#!/usr/bin/env python3
"""
Simple Domain — Runner Multi-Plataforma Unificado (Windows / Linux / macOS)
Inicia y monitoriza los 4 servicios concurrentemente con un dashboard estático
de 4 paneles que se actualiza en el mismo lugar de la pantalla (usando Rich Live).

Servicios:
  1. Motor de Inferencia RELIC Engine (:8080)
  2. Microkernel RELIC MCP en Rust (:5000)
  3. Agentic Gateway & MCP (:3000)
  4. Frontend UI Cyberpunk HUD (:5173)
"""

import io
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from collections import deque
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.text import Text

# Raíz del proyecto
PROJECT_ROOT = Path(__file__).resolve().parent
RELIC_PROJECT_ROOT = PROJECT_ROOT.parent / "RELIC-project"

# Configuración de los 4 servicios
SERVICES: list[dict[str, Any]] = [
    {
        "id": "relic_engine",
        "name": "1. Motor RELIC Engine (C Nativo)",
        "port": 8080,
        "style": "cyan",
    },
    {
        "id": "relic_mcp",
        "name": "2. Microkernel RELIC MCP (Rust)",
        "port": 5000,
        "style": "green",
    },
    {
        "id": "gateway",
        "name": "3. Agentic Gateway & MCP",
        "port": 3000,
        "style": "yellow",
    },
    {
        "id": "frontend",
        "name": "4. Frontend Web UI (Cyberpunk HUD)",
        "port": 5173,
        "style": "magenta",
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


def run_relic_engine() -> None:
    service_id = "relic_engine"
    exe_name = "relic.exe" if os.name == "nt" else "relic"
    engine_exe = RELIC_PROJECT_ROOT / exe_name

    if not engine_exe.exists():
        # Intentar relic_cli.exe como alternativa
        alt_exe = RELIC_PROJECT_ROOT / ("relic_cli.exe" if os.name == "nt" else "relic_cli")
        if alt_exe.exists():
            engine_exe = alt_exe

    if not engine_exe.exists():
        STATUS[service_id] = "Compilación requerida"
        log_line(service_id, f"[INFO] Binario {exe_name} no encontrado en {RELIC_PROJECT_ROOT}.")
        log_line(service_id, "[INFO] Compila RELIC-project con build.ps1 / Makefile o usa Docker Compose.")
        return

    # Buscar modelo .relic en models/ o resultados/
    candidates = [
        RELIC_PROJECT_ROOT / "models" / "relic_core.relic",
        RELIC_PROJECT_ROOT / "resultados" / "relic_core.relic",
        RELIC_PROJECT_ROOT / "relic_core.relic",
        RELIC_PROJECT_ROOT / "models" / "nano_model.relic",
    ]
    model_file = None
    for cand in candidates:
        if cand.exists():
            model_file = cand
            break

    cmd = [str(engine_exe), "--server", "--port", "8080"]
    if model_file:
        cmd.extend(["--model", str(model_file)])

    log_line(service_id, f"[START] Iniciando RELIC Engine en puerto 8080 con modelo: {model_file.name if model_file else 'default'}...")
    spawn_and_stream(service_id, cmd, cwd=RELIC_PROJECT_ROOT)


def run_relic_mcp() -> None:
    service_id = "relic_mcp"
    mcp_dir = PROJECT_ROOT / "relic_mcp"
    if not mcp_dir.exists():
        STATUS[service_id] = "Omitido"
        log_line(service_id, f"[INFO] Directorio {mcp_dir} no encontrado.")
        return

    ext = ".exe" if os.name == "nt" else ""
    server_bin = mcp_dir / "target" / "release" / f"relic_server{ext}"
    if server_bin.exists():
        cmd = [str(server_bin)]
    else:
        cargo = shutil.which("cargo")
        if not cargo:
            STATUS[service_id] = "Error (Cargo no encontrado)"
            log_line(service_id, "[ERROR] Rust/Cargo no está instalado en el sistema.")
            return
        cmd = [cargo, "run", "--release", "-p", "relic_server"]
    spawn_and_stream(service_id, cmd, cwd=mcp_dir)


def run_gateway() -> None:
    service_id = "gateway"
    node = shutil.which("node")
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    gateway_dir = PROJECT_ROOT / "agentic_gateway"

    if not node:
        STATUS[service_id] = "Error (Node no encontrado)"
        log_line(service_id, "[ERROR] Node.js no está instalado en el sistema.")
        return

    # Verificar dependencias
    if not (gateway_dir / "node_modules").exists() and npm:
        STATUS[service_id] = "npm install..."
        log_line(service_id, "[SETUP] Instalando dependencias del Gateway...")
        try:
            subprocess.run([npm, "install", "--silent"], cwd=gateway_dir, check=False)
        except OSError as err:
            log_line(service_id, f"[WARN] npm install fallo: {err}")

    env = os.environ.copy()
    env["PORT"] = "3000"
    env["RELIC_SERVER_URL"] = "http://127.0.0.1:8080"

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

    # Verificar dependencias
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
    STATUS[service_id] = "Activo"
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=str(cwd) if cwd else None,
            env=env,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace",
        )
        PROCESSES.append(proc)
    except Exception as err:
        STATUS[service_id] = "Fallo"
        log_line(service_id, f"[ERROR] No se pudo iniciar el proceso: {err}")
        return

    def reader_thread() -> None:
        try:
            if proc.stdout:
                for line in proc.stdout:
                    if STOP_EVENT.is_set():
                        break
                    log_line(service_id, line)
        except Exception as err:
            log_line(service_id, f"[WARN] Fin del flujo de logs: {err}")
        finally:
            ret = proc.wait()
            if not STOP_EVENT.is_set():
                STATUS[service_id] = f"Finalizado ({ret})"
                log_line(service_id, f"[INFO] Proceso detenido con código {ret}")

    t = threading.Thread(
        target=reader_thread, daemon=True, name=f"LogReader-{service_id}"
    )
    t.start()


def make_service_panel(service: dict[str, Any], height: int) -> Panel:
    service_id = service["id"]
    with LOCK:
        logs = list(LOG_BUFFERS[service_id])[-height:]

    content = Text("\n".join(logs) if logs else "Esperando logs...")
    title = f"[{service['style']} bold]{service['name']} [{STATUS[service_id]}][/{service['style']} bold]"
    return Panel(
        content,
        title=title,
        border_style=service["style"],
        expand=True,
    )


def make_layout() -> Layout:
    layout = Layout(name="root")
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="body", ratio=1),
        Layout(name="footer", size=3),
    )
    layout["body"].split_column(
        Layout(name="top_row", ratio=1),
        Layout(name="bottom_row", ratio=1),
    )
    layout["top_row"].split_row(
        Layout(name="relic_engine", ratio=1),
        Layout(name="relic_mcp", ratio=1),
    )
    layout["bottom_row"].split_row(
        Layout(name="gateway", ratio=1),
        Layout(name="frontend", ratio=1),
    )
    return layout


def update_layout(layout: Layout, term_height: int) -> None:
    header_text = Text(
        "SIMPLE DOMAIN — ECOSISTEMA AGÉNTICO RELIC (LOCAL)",
        style="bold cyan",
        justify="center",
    )
    layout["header"].update(Panel(header_text, border_style="cyan", padding=(0, 1)))

    panel_height = max(3, (term_height - 12) // 2)

    for s in SERVICES:
        layout[s["id"]].update(make_service_panel(s, panel_height))

    footer_text = Text(
        "Frontend: :5173  |  Gateway: :3000  |  RELIC MCP: :5000  |  RELIC Engine: :8080    (Ctrl+C para salir)",
        style="dim white",
        justify="center",
    )
    layout["footer"].update(
        Panel(footer_text, border_style="dim white", padding=(0, 1))
    )


def render_dashboard() -> None:
    console = Console()
    layout = make_layout()

    with Live(layout, console=console, screen=True, auto_refresh=False) as live:
        while not STOP_EVENT.is_set():
            term_height = console.size.height
            update_layout(layout, term_height)
            live.refresh()
            time.sleep(0.25)


def cleanup(sig: int | None = None, frame: Any = None) -> None:
    STOP_EVENT.set()
    sys.stdout.write("\nDeteniendo los servicios de Simple Domain...\n")
    sys.stdout.flush()
    for proc in PROCESSES:
        try:
            if proc.poll() is None:
                if os.name == "nt":
                    try:
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                            check=False,
                        )
                    except Exception:
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
    sys.stdout.write("[OK] Todos los servicios han sido finalizados.\n")
    sys.exit(0)


def main() -> None:
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    workers = [
        threading.Thread(target=run_relic_engine, daemon=True, name="Worker-RELIC-Engine"),
        threading.Thread(target=run_relic_mcp, daemon=True, name="Worker-RELIC-MCP"),
        threading.Thread(target=run_gateway, daemon=True, name="Worker-Gateway"),
        threading.Thread(target=run_frontend, daemon=True, name="Worker-Frontend"),
    ]
    for w in workers:
        w.start()

    render_dashboard()


if __name__ == "__main__":
    main()
