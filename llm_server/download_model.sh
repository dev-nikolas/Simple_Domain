#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
MODEL_URL="https://huggingface.co/bartowski/Dolphin3.0-Llama3.2-3B-GGUF/resolve/main/Dolphin3.0-Llama3.2-3B-Q4_K_M.gguf"
DEST="$DIR/dolphin-2.9.4-llama3.2-3b-q4_k_m.gguf"

if [ -f "$DEST" ]; then
    echo "[OK] El modelo ya existe en: $DEST"
    exit 0
fi

echo "Descargando Dolphin 3B Q4_K_M (~2.02 GB) desde Hugging Face..."
curl -L -C - -o "$DEST" "$MODEL_URL"
echo "[OK] Modelo descargado exitosamente."

