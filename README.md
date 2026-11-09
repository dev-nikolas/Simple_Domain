# Simple Domain

**Simple Domain** es una plataforma agéntica soberana de ingeniería inversa y desarrollo técnico. Integra inferencia local nativa de alta eficiencia mediante **RELIC**, un middleware orquestador en arquitectura **MVC**, y una interfaz visual **Cyberpunk HUD**.

---

## Componentes del Ecosistema

1. **RELIC Engine (`../RELIC-project`)**: Motor nativo en C/C++ de inferencia local con soporte para cartuchos LoRA de dominio técnico, persistencia de slots KV y memoria episódica.
2. **Agentic Gateway (`agentic_gateway/`)**: Orquestador desacoplado bajo arquitectura **MVC** que gestiona sesiones, herramientas en cuarentena, streaming Server-Sent Events (SSE) y puente MCP en Rust.
3. **Frontend HUD (`frontend/`)**: Interfaz de usuario React 18 + TypeScript inspirada en estilos Kitsch 2077 y Edgerunners, con telemetría en tiempo real y selector de cartuchos.

---

## Inicio Rápido

### Opción 1: Ejecución Directa Unificada con `run.py` (Recomendado)

El script `run.py` orquesta e inicializa automáticamente todos los procesos necesarios (Motor RELIC, Microkernel MCP, Gateway y Frontend) en un único dashboard de consola interactivo:

```bash
python run.py
```

Al iniciarse, los servicios estarán disponibles en sus puertos designados:
- **Frontend Web:** [http://localhost:5173](http://localhost:5173)
- **Agentic Gateway:** [http://localhost:3000](http://localhost:3000)
- **RELIC Engine:** [http://localhost:8080](http://localhost:8080)
- **MCP Microkernel:** [http://localhost:5000](http://localhost:5000)

### Opción 2: Despliegue con Docker Compose

Si prefieres aislar los contenedores en producción:

```bash
docker compose up --build -d
```

---

## Documentación Detallada

Para consultar la arquitectura interna, árboles de directorios exhaustivos, especificación de endpoints o guías por módulo, consulta la documentación específica:

- **[Documentación Técnica y Rutas de la API](docs/README.md)**: Diagramas de flujo, árbol completo de archivos y especificación de endpoints REST/SSE.
- **[Agentic Gateway](agentic_gateway/README.md)**: Estructura MVC, modelos, controladores, vistas y suite de pruebas unitarias.
- **[Frontend HUD](frontend/README.md)**: Componentes visuales, hooks desacoplados, estilos y servicios.
- **[Suite de Pruebas](tests/README.md)**: Pruebas de integración, benchmarks y suites de validación organizadas.
