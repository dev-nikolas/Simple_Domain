# Agentic Gateway

Middleware orquestador del ecosistema Simple Domain. Implementa una **arquitectura MVC (Model-View-Controller)** limpia, modular y desacoplada, con un límite estricto de **menos de 180 líneas por archivo**.

---

## 1. Arquitectura

- **Controladores (`controllers/`)**: Contienen la lógica de negocio y orquestan las peticiones.
  - `chatController.mjs`: Maneja inferencia con RELIC Engine, streaming SSE y persistencia de slots.
  - `sessionController.mjs`: Operaciones CRUD sobre sesiones y mensajes.
  - `memoryController.mjs`: Gestión de la memoria episódica técnica.
  - `toolController.mjs`: Catálogo y ejecución de herramientas en sandbox.
  - `healthController.mjs`: Verificación de salud y telemetría.
- **Modelos (`models/`)**: Entidades de datos y persistencia.
  - `SessionModel.mjs`: Manejo atómico y debounced de conversaciones en JSON.
  - `MemoryModel.mjs`: Persistencia de conclusiones y formateo de contexto para system prompt.
  - `SlotModel.mjs`: Caché en disco para slots KV y política de desalojo LRU.
- **Vistas (`views/`)**: Serialización y cabeceras de respuesta.
  - `jsonView.mjs`: Respuestas JSON y cabeceras CORS unificadas.
  - `sseView.mjs`: Formateo del protocolo Server-Sent Events (`data: ...\n\n`).
  - `healthView.mjs`: Formato de diagnóstico del sistema.
- **Rutas (`routes/`)**:
  - `router.mjs`: Despachador HTTP puro que conecta verbos y rutas a los controladores.
- **Herramientas (`tools/`)**:
  - `catalog.mjs`: Esquemas de herramientas locales compatibles con OpenAI/MCP.
  - `executors.mjs`: Despachador con aislamiento en carpeta de cuarentena y fallback al MCP Rust.
  - `index.mjs`: Exportación unificada.

---

## 2. Variables de Entorno

| Variable | Valor por Defecto | Descripción |
| :--- | :--- | :--- |
| `PORT` | `3000` | Puerto HTTP del Gateway |
| `HOST` | `0.0.0.0` | Interfaz de escucha de red |
| `RELIC_SERVER_URL` | `http://127.0.0.1:8080` | URL base del motor nativo de inferencia RELIC |
| `SESSIONS_FILE` | `./data/sessions.json` | Ruta del almacén de conversaciones |
| `MEMORY_FILE` | `./data/relic_memory.json` | Ruta de la memoria episódica |
| `QUARANTINE_DIR` | `./data/quarantine` | Directorio seguro de ejecución de archivos |

---

## 3. Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start

# Ejecutar suite de pruebas unitarias
npm test
```

---

## 4. Pruebas Automatizadas

La suite de pruebas utiliza el ejecutor nativo `node:test` sin dependencias externas:

- `tests/sessions.test.mjs`: Ciclo de vida y paginación de sesiones.
- `tests/memory.test.mjs`: Persistencia de memoria episódica y contexto.
- `tests/tools.test.mjs`: Ejecución y seguridad de herramientas locales.
- `tests/router.test.mjs`: Mapeo de rutas REST y preflight CORS.
- `tests/views.test.mjs`: Serialización JSON y streaming SSE.

