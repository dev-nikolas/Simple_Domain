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
import socket
import subprocess
import sys
import tempfile
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

# Puertos asignados dinámicamente
ASSIGNED_PORTS: dict[str, int] = {}

def is_port_free(port: int, host: str = "0.0.0.0") -> bool:
    """Comprueba si un puerto TCP está disponible para enlace (0.0.0.0 y 127.0.0.1)."""
    for check_host in (host, "127.0.0.1") if host != "127.0.0.1" else (host,):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.4)
            try:
                s.bind((check_host, port))
            except OSError:
                return False
    return True

def find_available_port(default_port: int, service_id: str, max_attempts: int = 50) -> int:
    """
    Determina el puerto disponible más cercano a partir del default_port.
    Genera log de análisis si el puerto por defecto se encuentra ocupado.
    """
    for offset in range(max_attempts):
        candidate = default_port + offset
        if is_port_free(candidate):
            if offset > 0:
                print(f"[PORT SCAN] Puerto por defecto {default_port} ocupado para '{service_id}'. Reubicado dinámicamente en {candidate}.")
            else:
                print(f"[PORT SCAN] Puerto {default_port} libre para '{service_id}'.")
            return candidate
    raise RuntimeError(f"No se encontró ningún puerto disponible en el rango [{default_port}, {default_port + max_attempts}) para {service_id}")

# Detección inicial de puertos disponibles
ASSIGNED_PORTS["relic_engine"] = find_available_port(8080, "relic_engine")
ASSIGNED_PORTS["relic_mcp"] = find_available_port(5000, "relic_mcp")
ASSIGNED_PORTS["gateway"] = find_available_port(3000, "gateway")
ASSIGNED_PORTS["frontend"] = find_available_port(5173, "frontend")

# Configuración de los 4 servicios
SERVICES: list[dict[str, Any]] = [
    {
        "id": "relic_engine",
        "name": f"1. RELIC Engine (:{ASSIGNED_PORTS['relic_engine']})",
        "port": ASSIGNED_PORTS["relic_engine"],
        "style": "cyan",
    },
    {
        "id": "relic_mcp",
        "name": f"2. RELIC MCP (:{ASSIGNED_PORTS['relic_mcp']})",
        "port": ASSIGNED_PORTS["relic_mcp"],
        "style": "green",
    },
    {
        "id": "gateway",
        "name": f"3. Gateway (:{ASSIGNED_PORTS['gateway']})",
        "port": ASSIGNED_PORTS["gateway"],
        "style": "yellow",
    },
    {
        "id": "frontend",
        "name": f"4. Frontend (:{ASSIGNED_PORTS['frontend']})",
        "port": ASSIGNED_PORTS["frontend"],
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
        if service_id == "relic_engine":
            if "Pre-calentando" in clean:
                STATUS[service_id] = "Calentando KV (20s)..."
            elif "[MODO SERVIDOR]" in clean or "Iniciando API Server" in clean:
                STATUS[service_id] = "Abriendo puerto..."
            elif "Servidor HTTP activo" in clean:
                STATUS[service_id] = "Online (Listo)"
        elif service_id == "gateway":
            if "En línea en" in clean:
                STATUS[service_id] = "Online"
        elif service_id == "frontend":
            if "ready in" in clean or "Local:" in clean:
                STATUS[service_id] = "Online"


def _find_c_compiler() -> str | None:
    for candidate in ("clang", "gcc", "cc"):
        found = shutil.which(candidate)
        if found:
            return found
    if os.name == "nt":
        llvm_clang = Path(r"C:\Program Files\LLVM\bin\clang.exe")
        if llvm_clang.exists():
            return str(llvm_clang)
    return None


def _build_relic_server_from_source(service_id: str) -> Path | None:
    """Compila el servidor C directamente desde RELIC-project/src a caché temporal si hace falta."""
    src_dir = RELIC_PROJECT_ROOT / "src"
    inc_dir = RELIC_PROJECT_ROOT / "include"
    if not src_dir.exists():
        STATUS[service_id] = "Error (src no encontrado)"
        log_line(service_id, f"[ERROR] No existe {src_dir}")
        return None

    c_files = sorted(src_dir.rglob("*.c"))
    h_files = sorted(list(inc_dir.rglob("*.h")) + list(src_dir.rglob("*.h")))
    if not c_files:
        STATUS[service_id] = "Error (sin fuentes .c)"
        return None

    ext = ".exe" if os.name == "nt" else ""
    out_bin = Path(tempfile.gettempdir()) / f"relic_server_runtime{ext}"
    latest_src_mtime = max(p.stat().st_mtime for p in (*c_files, *h_files))

    if out_bin.exists() and out_bin.stat().st_mtime >= latest_src_mtime:
        return out_bin

    cc = _find_c_compiler()
    if not cc:
        STATUS[service_id] = "Error (Compilador C no encontrado)"
        log_line(service_id, "[ERROR] No se encontró clang/gcc para compilar RELIC-project/src/server.")
        return None

    STATUS[service_id] = "Compilando src/server..."
    log_line(service_id, f"[BUILD] Compilando RELIC-project/src (server) con {Path(cc).name}...")
    include_dirs = [inc_dir, *(p for p in src_dir.iterdir() if p.is_dir())]
    cmd = [cc, "-std=c11", "-O2"]
    for inc in include_dirs:
        cmd.extend(["-I", str(inc)])
    if os.name == "nt":
        cmd.extend(["-D_CRT_SECURE_NO_WARNINGS", "-mavx2", "-mfma"])
    else:
        cmd.extend(["-march=native"])
    cmd.extend(str(p) for p in c_files)
    if os.name == "nt":
        cmd.append("-lws2_32")
    else:
        cmd.extend(["-lm", "-lpthread"])
    cmd.extend(["-o", str(out_bin)])

    res = subprocess.run(cmd, cwd=RELIC_PROJECT_ROOT, capture_output=True, text=True)
    if res.returncode != 0:
        STATUS[service_id] = "Error de compilación"
        for line in (res.stderr or res.stdout).splitlines()[-15:]:
            log_line(service_id, line)
        return None
    return out_bin


def run_relic_engine() -> None:
    service_id = "relic_engine"
    engine_port = ASSIGNED_PORTS[service_id]

    # Buscar modelo .relic en models/
    candidates = [
        RELIC_PROJECT_ROOT / "models" / "relic_core.relic",
        RELIC_PROJECT_ROOT / "resultados" / "relic_core.relic",
        RELIC_PROJECT_ROOT / "relic_core.relic",
        RELIC_PROJECT_ROOT / "models" / "nano_model.relic",
    ]
    model_file = next((c for c in candidates if c.exists()), None)
    if model_file is None:
        STATUS[service_id] = "Error (sin modelo .relic)"
        log_line(service_id, f"[ERROR] No se encontró ningún modelo .relic en {RELIC_PROJECT_ROOT / 'models'}.")
        return

    server_bin = _build_relic_server_from_source(service_id)
    if server_bin is None:
        return

    cmd = [str(server_bin), "--model", str(model_file), "--server", "--port", str(engine_port)]
    log_line(service_id, f"[START] Iniciando RELIC Server (src/server) en puerto {engine_port} con modelo: {model_file.name}...")
    spawn_and_stream(service_id, cmd, cwd=RELIC_PROJECT_ROOT)


def run_relic_mcp() -> None:
    service_id = "relic_mcp"
    mcp_port = ASSIGNED_PORTS[service_id]
    mcp_dir = PROJECT_ROOT / "relic_mcp"
    if not mcp_dir.exists():
        STATUS[service_id] = "Omitido"
        log_line(service_id, f"[INFO] Directorio {mcp_dir} no encontrado.")
        return

    env = os.environ.copy()
    env["PORT"] = str(mcp_port)

    ext = ".exe" if os.name == "nt" else ""
    server_bin = mcp_dir / "target" / "release" / f"relic_server{ext}"
    if server_bin.exists():
        cmd = [str(server_bin), str(mcp_port)]
    else:
        cargo = shutil.which("cargo")
        if not cargo:
            STATUS[service_id] = "Error (Cargo no encontrado)"
            log_line(service_id, "[ERROR] Rust/Cargo no está instalado en el sistema.")
            return
        cmd = [cargo, "run", "--release", "-p", "relic_server", "--", str(mcp_port)]
    spawn_and_stream(service_id, cmd, cwd=mcp_dir, env=env)


def run_gateway() -> None:
    service_id = "gateway"
    gateway_port = ASSIGNED_PORTS[service_id]
    engine_port = ASSIGNED_PORTS["relic_engine"]
    mcp_port = ASSIGNED_PORTS["relic_mcp"]

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
    env["PORT"] = str(gateway_port)
    env["RELIC_SERVER_URL"] = f"http://127.0.0.1:{engine_port}"
    env["RELIC_MCP_URL"] = f"http://127.0.0.1:{mcp_port}"

    cmd = [node, "server.mjs"]
    spawn_and_stream(service_id, cmd, cwd=gateway_dir, env=env)


def run_frontend() -> None:
    service_id = "frontend"
    frontend_port = ASSIGNED_PORTS[service_id]
    gateway_port = ASSIGNED_PORTS["gateway"]

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

    env = os.environ.copy()
    env["VITE_GATEWAY_URL"] = f"http://127.0.0.1:{gateway_port}"

    cmd = [npm, "run", "dev", "--", "--host", "127.0.0.1", "--port", str(frontend_port)]
    spawn_and_stream(service_id, cmd, cwd=frontend_dir, env=env)


def spawn_and_stream(
    service_id: str,
    cmd: list[str],
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
) -> None:
    if service_id == "relic_engine":
        STATUS[service_id] = "Cargando Modelo..."
    else:
        STATUS[service_id] = "Iniciando..."
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
        "RELIC — ECOSISTEMA LOCAL",
        style="bold cyan",
        justify="center",
    )
    layout["header"].update(Panel(header_text, border_style="cyan", padding=(0, 1)))

    panel_height = max(3, (term_height - 12) // 2)

    for s in SERVICES:
        layout[s["id"]].update(make_service_panel(s, panel_height))

    engine_status = STATUS.get("relic_engine", "")
    if "Online" not in engine_status:
        footer_msg = f"⏳ Esperando motor C99 (pre-calentando tensores en CPU ~20s)... | Frontend: :{ASSIGNED_PORTS['frontend']} | Gateway: :{ASSIGNED_PORTS['gateway']}"
        footer_style = "bold yellow"
    else:
        footer_msg = f"🟢 Sistema 100% Online | Frontend: http://127.0.0.1:{ASSIGNED_PORTS['frontend']} | Motor C99: :{ASSIGNED_PORTS['relic_engine']} (Ctrl+C para salir)"
        footer_style = "bold green"

    footer_text = Text(footer_msg, style=footer_style, justify="center")
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
