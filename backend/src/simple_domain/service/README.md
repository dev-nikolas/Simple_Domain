# Simple Domain — Servicio HTTP Local (Service Layer)

Capa de servicio HTTP REST basada en FastAPI que expone el motor de detección de anomalías y los módulos de gestión con persistencia JSON.

---

## Estructura de Directorios

Todos los módulos del servicio se encuentran en `src/simple_domain/service/`:

```
src/simple_domain/service/
├── app.py                  # Factoría FastAPI, middleware CORS y endpoints núcleo
├── modular_setup.py        # Inicialización de almacenamiento, repositorios y routers
├── schemas.py              # Esquemas Pydantic v2 del núcleo (Health, Info, Score)
├── modular_schemas.py      # Esquemas Pydantic v2 para módulos funcionales
├── server.py               # Punto de entrada CLI con Uvicorn
└── routes/
    ├── research.py         # Endpoints para Investigación y Experimentos
    ├── data_sources.py     # Endpoints para Catálogo de Fuentes de Datos
    ├── patterns.py         # Endpoints para Catálogo de Patrones
    └── settings.py         # Endpoints para Preferencias del Sistema
```

---

## Tabla de Rutas y Endpoints

### 1. Núcleo del Servicio (`src/simple_domain/service/app.py`)

| Método | Ruta | Ubicación del Código | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/health` | `service/app.py` | Estado de salud y diagnóstico del detector (`ready`, `unfitted`, etc.). |
| **GET** | `/v1/info` | `service/app.py` | Capacidades verificadas, versiones y metadatos no sensibles. |
| **POST** | `/v1/score` | `service/app.py` | Cálculo de anomalía para observación tabular multivariada. |

### 2. Módulo de Investigación (`service/routes/research.py`)

| Método | Ruta | Ubicación del Código | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/v1/research/experiments` | `service/routes/research.py` | Listar experimentos (filtro opcional por `?status=`). |
| **POST** | `/v1/research/experiments` | `service/routes/research.py` | Registrar un nuevo experimento con ID único (`exp_XXXXXXXX`). |
| **GET** | `/v1/research/experiments/{id}` | `service/routes/research.py` | Consultar detalle de un experimento por ID. |
| **PATCH** | `/v1/research/experiments/{id}` | `service/routes/research.py` | Modificar campos permitidos de un experimento. |
| **DELETE** | `/v1/research/experiments/{id}` | `service/routes/research.py` | Eliminar registro de experimento (204 No Content). |

### 3. Módulo de Fuentes de Datos (`service/routes/data_sources.py`)

| Método | Ruta | Ubicación del Código | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/v1/data-sources` | `service/routes/data_sources.py` | Listar catálogo de fuentes (filtro opcional por `?format=`). |
| **POST** | `/v1/data-sources` | `service/routes/data_sources.py` | Registrar fuente (CSV, JSON, XLSX; validación anti-traversal). |
| **GET** | `/v1/data-sources/{id}` | `service/routes/data_sources.py` | Obtener datos de una fuente registrada. |
| **PATCH** | `/v1/data-sources/{id}` | `service/routes/data_sources.py` | Actualizar metadatos de una fuente. |
| **DELETE** | `/v1/data-sources/{id}` | `service/routes/data_sources.py` | Eliminar registro del catálogo (no borra archivos físicos). |

### 4. Módulo de Patrones (`service/routes/patterns.py`)

| Método | Ruta | Ubicación del Código | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/v1/patterns` | `service/routes/patterns.py` | Listar catálogo de patrones (filtro por `?pattern_type=`). |
| **POST** | `/v1/patterns` | `service/routes/patterns.py` | Registrar patrón (valida referencia a `source_id` si existe). |
| **GET** | `/v1/patterns/{id}` | `service/routes/patterns.py` | Consultar detalle y metadatos de un patrón. |
| **PATCH** | `/v1/patterns/{id}` | `service/routes/patterns.py` | Modificar atributos y estado del patrón. |
| **DELETE** | `/v1/patterns/{id}` | `service/routes/patterns.py` | Eliminar registro de patrón del catálogo. |

### 5. Módulo de Configuración (`service/routes/settings.py`)

| Método | Ruta | Ubicación del Código | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/v1/settings` | `service/routes/settings.py` | Obtener preferencias configurables del sistema. |
| **PATCH** | `/v1/settings` | `service/routes/settings.py` | Actualizar preferencias admitidas (valida claves permitidas). |
| **POST** | `/v1/settings/reset` | `service/routes/settings.py` | Restablecer preferencias a los valores por defecto. |

### 6. Módulo de Análisis y Motor Brain (`service/routes/analysis.py`)

| Método | Ruta | Ubicación del Código | Descripción |
| :--- | :--- | :--- | :--- |
| **POST** | `/v1/analysis` | `service/routes/analysis.py` | Ingesta de archivo CSV/JSON (multipart), normalización y ejecución de Brain (compatibilidad Fase 1). |
| **GET** | `/v1/analysis` | `service/routes/analysis.py` | Listar análisis persistidos con resumen y fecha. |
| **GET** | `/v1/analysis/{id}` | `service/routes/analysis.py` | Consultar resultado completo de un análisis por ID. |

### 7. Ciclo de Vida de Archivos Archive (`service/routes/archive.py`)

| Método | Ruta | Ubicación del Código | Descripción |
| :--- | :--- | :--- | :--- |
| **POST** | `/v1/archive/submit` | `service/routes/archive.py` | Envío asíncrono de archivo CSV/JSON (devuelve 202 Accepted inmediato). |
| **GET** | `/v1/archive` | `service/routes/archive.py` | Listado paginado de archivos archivados. |
| **GET** | `/v1/archive/{id}` | `service/routes/archive.py` | Metadatos y estado actual del archivo/trabajo. |
| **GET** | `/v1/archive/{id}/result`| `service/routes/archive.py` | Recuperación del resultado persistido en Brain o estado. |
| **GET** | `/v1/archive/{id}/events`| `service/routes/archive.py` | Streaming SSE de eventos en tiempo real con soporte de Last-Event-ID. |

### 8. Espacio Conversacional (`service/routes/conversations.py`)

| Método | Ruta | Ubicación del Código | Descripción |
| :--- | :--- | :--- | :--- |
| **POST** | `/v1/conversations` | `service/routes/conversations.py` | Crear conversación con título opcional o provisional. |
| **GET** | `/v1/conversations` | `service/routes/conversations.py` | Listar conversaciones activas ordenadas por fecha. |
| **GET** | `/v1/conversations/{id}` | `service/routes/conversations.py` | Obtener conversación con mensajes y referencias de archivos. |
| **POST** | `/v1/conversations/{id}/messages` | `service/routes/conversations.py` | Agregar mensaje de usuario o asistente al hilo. |

---

## Persistencia y Almacenamiento

- **Repositorios**: En `src/simple_domain/repositories/` desacoplados de la capa HTTP.
- **Directorio canónico**: `storage/` en la raíz del proyecto Python (resuelto de forma estable). Sobrescribible mediante la variable de entorno `SIMPLE_DOMAIN_DATA_DIR`.
- **Estructura canónica**:
  - `storage/conversations.json`: Historial y mensajes de conversaciones.
  - `storage/archives/`: Directorios individuales por archivo (`manifest.json`, `normalized.json`, `result.json`, `events.json`).
  - `storage/archives.json`: Índice rápido de archivos y trabajos.
  - `storage/analyses.json`: Registro de análisis históricos.
  - `storage/research.json`: Experimentos de laboratorio.
  - `storage/data_sources.json`: Fuentes de datos registradas.
  - `storage/patterns.json`: Catálogo de patrones.
  - `storage/settings.json`: Preferencias del sistema.

- **Escritura segura**: Atómica con reemplazo seguro de archivos y exclusión mutua en memoria para concurrencia local.


---

## Ejecución del Backend

Para iniciar el servidor localmente:

```bash
# Servidor con modelo de demostración inicializado
python -m simple_domain.service.server --port 4000 --demo-model

# Con directorio de datos personalizado
$env:SIMPLE_DOMAIN_DATA_DIR = "./data_local"
python -m simple_domain.service.server --port 4000 --demo-model
```

Documentación interactiva Swagger:
`http://127.0.0.1:4000/docs`
