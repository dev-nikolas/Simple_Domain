# Simple Domain — Local Cognitive & Neuro-Symbolic Chat

[![Docker Compose](https://img.shields.io/badge/Docker_Compose-v2-blue?logo=docker)](file:///c:/Users/Nicolas%20Pachon/Desktop/Seis%20Ojos/Simple_Domain/docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-green?logo=node.js)](https://nodejs.org)
[![Rust](https://img.shields.io/badge/Rust-1.85+-orange?logo=rust)](https://www.rust-lang.org)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev)
[![Model](https://img.shields.io/badge/LLM-Dolphin_3.0_Llama_3.2_(3B)_Q4_K_M-purple)](https://huggingface.co/bartowski/Dolphin3.0-Llama3.2-3B-GGUF)
[![Protocol](https://img.shields.io/badge/Protocol-Model_Context_Protocol_(MCP)-black)](https://modelcontextprotocol.io)

Entorno de asistencia técnica conversacional y programación agéntica **100% local, soberano y sin telemetría externa**. 

Combina un modelo de lenguaje autoregresivo compacto (**Dolphin 3.0 / Llama 3.2 3B**) con un microkernel neuro-simbólico determinista en Rust (**RELIC**) a través del estándar **Model Context Protocol (MCP)**, gobernado por una interfaz reactiva en **TypeScript/React** con streaming en tiempo real vía Server-Sent Events (SSE).

---

## 1. Arquitectura del Sistema

```mermaid
graph TD
    subgraph Client ["Capa de Presentación"]
        UI["React 18 + TypeScript (Vite / Nginx :5173)<br/>Streaming SSE · AbortController · Buffer TCP Anti-Jank"]
    end

    subgraph Middleware ["Capa Orquestadora Agéntica"]
        GW["Agentic Gateway (:4000)<br/>OpenAI Compatibility · Loop Agéntico · Intercepción de Tool Calls"]
    end

    subgraph Inference ["Motor Cognitivo"]
        LLM["llama-server (:8081 / :8080 en Docker)<br/>Dolphin 3B Q4_K_M · AVX2 CPU Cómputo"]
    end

    subgraph Kernel ["Microkernel Simbólico y Herramientas"]
        MCP["RELIC Microkernel (Rust)<br/>BlackwallGate · Invariantes SHA-256 · stdio JSON-RPC 2.0"]
        REST["RELIC Engine (:5000)<br/>Inferencia Neuro-Simbólica · Memoria Episódica RIR"]
    end

    UI -->|POST /v1/chat/completions (SSE Stream)| GW
    GW -->|Forward Prompt + Tools Schema| LLM
    LLM -->|Stream Tokens / Tool Calls| GW
    GW -.->|Si es Tool Call: JSON-RPC 2.0 via stdio| MCP
    MCP -.->|Respuesta Verificada| GW
    GW -.->|Re-inyección al contexto| LLM
    GW -->|SSE Stream unificado al usuario| UI
    GW -.->|Consultas de Engramas| REST
```

---

## 2. Componentes del Stack

### A. Frontend Web (`frontend/`)
* **Tecnología:** React 18, TypeScript, TailwindCSS y Lucide Icons.
* **Consumo de Inferencia:** Implementación nativa con `ReadableStream` y `TextDecoder` en `llmClient.ts` y hook desacoplado `useChat.ts`.
* **Resiliencia de Red:** Buffer de fragmentación TCP para evitar que chunks partidos rompan el parser JSON durante el streaming SSE.
* **Despliegue:** Servidor multi-stage con `nginx:alpine-slim` y enrutamiento SPA.

### B. Agentic Gateway (`llm_server/agentic_gateway/`)
* **Tecnología:** Node.js (ES Modules nativos).
* **Protocolo:** Implementa un cliente MCP compatible con la especificación `2025-03-26` vía tuberías estándar `stdio` sobre el binario de Rust.
* **Bucle Agéntico:** Intercepta llamadas a herramientas (`relic_interpret`, `relic_verify`, `read_code_file`, etc.), ejecuta las acciones en el microkernel y retroalimenta al modelo para generar la explicación final.

### C. Motor LLM Local (`llm_server/`)
* **Modelo:** `dolphin-2.9.4-llama3.2-3b-q4_k_m.gguf` (2.02 GB).
* **Inferencia:** `llama-server` optimizado para AVX2/FMA3.
* **Afinación de Hardware (Intel Core i7-6500U):**
  * `-t 2` (2 núcleos físicos) para evitar contención de caché L3 (4 MB).
  * `-np 1` (1 slot) para dedicar el ancho de banda de memoria completo a la sesión activa.
  * `--flash-attn off` para evitar overhead de mosaico en CPU sin aceleración matricial.
  * Asignación de prioridad `BelowNormal` en el SO para garantizar fluidez del frontend.

### D. Microkernel RELIC (`relic/`)
* **Tecnología:** Rust 2024 / Cargo workspace.
* **Seguridad:** Control de estado protegido por `BlackwallGate` (cero mutaciones sin verificación previa, oráculo de regresión y commits criptográficos SHA-256).
* **Herramientas MCP:** Expone 12 herramientas formales (`relic_interpret`, `relic_verify`, `relic_retrieve`, `relic_activate`, `relic_diff`, `relic_spectral`, etc.).
* **Contenedor:** Imagen hardened distroless sin shell (`gcr.io/distroless/cc-debian12:nonroot`) y usuario no-root (`UID 65532`).

---

## 3. Inicio Rápido (Quickstart)

### Opción 1: Aprovisionamiento y Dockerización Automática (Recomendado)

Dispones de un script en JavaScript multiplataforma que comprueba si los pesos del modelo existen, los descarga automáticamente desde Hugging Face si hacen falta y levanta todo el stack con Docker Compose:

```bash
# Con Node.js (Windows, Linux, macOS)
node setup_and_dockerize.mjs
```

O si prefieres Bash (Linux/WSL):
```bash
chmod +x setup_and_dockerize.sh
./setup_and_dockerize.sh
```

Una vez finalizado, accede a:
* **Frontend Web:** [http://localhost:5173](http://localhost:5173)
* **Agentic Gateway:** [http://localhost:4000](http://localhost:4000)
* **RELIC Server:** [http://localhost:5000](http://localhost:5000)
* **LLM Engine:** [http://localhost:8081](http://localhost:8081)

---

### Opción 2: Despliegue Local Nativo (Sin Docker)

Si prefieres ejecutar los procesos directamente sobre tu sistema operativo:

1. **Descargar el modelo (si aún no lo tienes):**
   ```bash
   bash llm_server/download_model.sh
   ```
2. **Compilar el microkernel RELIC:**
   ```bash
   cd relic
   cargo build -p relic_mcp
   cd ..
   ```
3. **Iniciar los servicios con el launcher unificado:**
   ```powershell
   # En Windows PowerShell
   .\start_stack.ps1
   ```
4. **Levantar el frontend de desarrollo:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 4. Matriz de Puertos y Servicios

| Servicio | Rol | Protocolo | Puerto Host | Modo Contenedor |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI** | Interfaz React 18 | HTTP / SSE | `5173` | `sd_frontend` (Nginx) |
| **Agentic Gateway** | Orquestador MCP & API | HTTP / JSON-RPC | `4000` | `sd_agentic_gateway` (Node 22) |
| **RELIC Server** | Motor Neuro-Simbólico | HTTP REST | `5000` | `sd_relic_engine` (Distroless) |
| **llama-server** | Inferencia LLM | HTTP OpenAI-compat | `8081` | `sd_llm_engine` (llama.cpp) |
| **RELIC MCP** | Herramientas del Kernel | stdio IPC | Interno | Subproceso en Gateway |

---

## 5. Política de Git y Gestión de Modelos Pesados

* **Regla estricta:** Los archivos de pesos (`*.gguf`), ejecutables nativos (`*.exe`, `*.dll`) y directorios de compilación (`target/`, `node_modules/`, `dist/`) están explícitamente ignorados en [.gitignore](file:///c:/Users/Nicolas%20Pachon/Desktop/Seis%20Ojos/Simple_Domain/.gitignore).
* **Cumplimiento de límites de GitHub:** Al no incluir archivos binarios de >100 MB en los commits, el repositorio permanece ligero, auditable y listo para `git push` inmediato a GitHub sin consumir cuotas de Git LFS.
* Los pesos son provisionados on-demand por los scripts de configuración directamente desde el repositorio oficial de Hugging Face (`bartowski/Dolphin3.0-Llama3.2-3B-GGUF`).

---

## 6. Comandos de Verificación y Auditoría

```bash
# Comprobar salud del Gateway y conteo de herramientas MCP activas
curl http://localhost:4000/health

# Comprobar estado del motor LLM
curl http://localhost:8081/health

# Inferencia directa con streaming en consola
curl -N http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Verifica el estado de RELIC"}],"stream":true}'
```

---

## 7. Licencia

Desarrollado como entorno de desarrollo local soberano. Código base bajo licencia MIT / AGPL-3.0 según especificado en cada submódulo.
