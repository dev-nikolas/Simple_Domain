"""
Simple Domain — Entrypoint del Servidor HTTP Local

Inicia el servidor uvicorn vinculado exclusivamente a localhost (127.0.0.1) por defecto.
"""

from __future__ import annotations

import argparse
import os
import sys
import uvicorn

from simple_domain.pipeline import SimpleDomainPipeline
from simple_domain.service.app import create_app


def run_server(
    host: str = "127.0.0.1",
    port: int = 4000,
    pipeline: SimpleDomainPipeline | None = None,
    log_level: str = "info",
) -> None:
    """Ejecuta el servidor HTTP local mediante uvicorn."""
    # Restricción de seguridad: vincular exclusivamente a 127.0.0.1
    if host not in ("127.0.0.1", "localhost"):
        print(f"[ADVERTENCIA DE SEGURIDAD] Por directriz de diseño, el servicio solo debe vincularse a localhost (127.0.0.1). Cambiando {host} a 127.0.0.1.")
        host = "127.0.0.1"

    app = create_app(pipeline=pipeline)
    print(f"[Simple Domain API] Iniciando servidor local en http://{host}:{port}")
    print(f"[Simple Domain API] Documentación Swagger disponible en: http://{host}:{port}/docs")

    uvicorn.run(app, host=host, port=port, log_level=log_level)


def main():
    parser = argparse.ArgumentParser(description="Simple Domain — Servidor HTTP Local v0.1")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host de enlace (fijado a 127.0.0.1)")
    parser.add_argument("--port", type=int, default=4000, help="Puerto local (def: 4000)")
    parser.add_argument(
        "--demo-model",
        action="store_true",
        help="Ajusta y calibra un modelo sintético de demostración para pruebas locales inmediatas.",
    )

    args = parser.parse_args()

    pipeline = None
    if args.demo_model:
        from simple_domain.experiments.benchmark_s1 import generate_benchmark_s1
        print("[Simple Domain API] Inicializando modelo de demostración con Benchmark S1...")
        ds = generate_benchmark_s1(seed=42, n_fit=300, n_calib=100, n_eval=50)
        pipeline = SimpleDomainPipeline(enable_relational=True, relational_weight=1.0)
        pipeline.fit(ds.fit_set)
        pipeline.calibrate(ds.calibration_set, quantile=0.95)
        print(f"[Simple Domain API] Modelo de demostración calibrado. Umbral: {pipeline.threshold:.4f}")

    run_server(host=args.host, port=args.port, pipeline=pipeline)


if __name__ == "__main__":
    main()
