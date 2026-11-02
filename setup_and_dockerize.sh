#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
MODEL_DIR="$DIR/llm_server"
MODEL_NAME="dolphin-2.9.4-llama3.2-3b-q4_k_m.gguf"
MODEL_PATH="$MODEL_DIR/$MODEL_NAME"
MODEL_URL="https://huggingface.co/bartowski/Dolphin3.0-Llama3.2-3B-GGUF/resolve/main/Dolphin3.0-Llama3.2-3B-Q4_K_M.gguf"

echo "============================================================"
echo "  SIMPLE DOMAIN — Autoprovisionamiento y Dockerización"
echo "============================================================"

mkdir -p "$MODEL_DIR"

if [ -f "$MODEL_PATH" ] && [ $(wc -c <"$MODEL_PATH") -gt 1000000000 ]; then
    echo "[OK] Modelo ya presente en: $MODEL_PATH"
else
    echo "[INIT] Descargando Dolphin 3B Q4_K_M (~2.02 GB) desde Hugging Face..."
    curl -L -C - -o "$MODEL_PATH" "$MODEL_URL"
    echo "[OK] Descarga finalizada exitosamente."
fi

echo ""
echo "[DOCKER] Construyendo y levantando contenedores con Docker Compose..."
docker compose -f "$DIR/docker-compose.yml" up --build -d

echo ""
echo "============================================================"
echo "  [STACK OPERATIVO] Todos los servicios han sido dockerizados:"
echo "  * Frontend Web:       http://localhost:5173"
echo "  * Agentic Gateway:    http://localhost:4000"
echo "  * Microkernel RELIC:  http://localhost:5000"
echo "  * Motor LLM (8081):   http://localhost:8081"
echo "============================================================"

