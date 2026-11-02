#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "============================================================"
echo "  SIMPLE DOMAIN — Orquestación y Despliegue en Docker"
echo "============================================================"
echo "  * Modelo alojado en volumen Docker (simple_domain_models)."
echo "  * Sin archivos pesados en el espacio del usuario."
echo "============================================================"

docker compose -f "$DIR/docker-compose.yml" up --build -d

echo ""
echo "============================================================"
echo "  [STACK OPERATIVO] Todos los servicios han sido dockerizados:"
echo "  * Frontend Web:       http://localhost:5173"
echo "  * Agentic Gateway:    http://localhost:4000"
echo "  * Microkernel RELIC:  http://localhost:5000"
echo "  * Motor LLM (8081):   http://localhost:8081"
echo "============================================================"
