# Simple Domain

**Simple Domain** es una plataforma agéntica soberana para ingeniería inversa, auditoría de seguridad y desarrollo técnico determinista en local. Opera como la suite de interfaz y orquestación para el modelo neuronal **RELIC** (entrenado y optimizado en `../RELIC-project`), proveyendo un middleware desacoplado en arquitectura **MVC** y un frontend conversacional con estética **Cyberpunk HUD / Gemini Minimalista**.

---

## Arquitectura del Ecosistema

1. **RELIC Model & Engine (`../RELIC-project`)**:
   - **Modelo Neuronal:** LLM de razonamiento técnico profundo (`<think>...</think>`) destilado y afinado mediante SFT y aprendizaje por refuerzo con recompensas verificables (Dr.GRPO). Especializado en análisis forense, seguridad de bajo nivel y arquitectura de sistemas.
   - **Cartuchos de Dominio:** Adaptadores LoRA modulares (`.lora.relic`) y bases de conocimiento binarias compactas (`.kb.relic`) para especialización en Sistemas/Kernel, Ciberseguridad/Reversing y GIS/Topología.
   - **Inferencia Local C-Native:** Motor de inferencia ultraligero sin telemetría externa, con gestión de slots de contexto KV y persistencia de memoria episódica.

2. **Agentic Gateway (`agentic_gateway/`)**:
   - Orquestador desacoplado bajo patrón **MVC** en Node.js (ESM puro).
   - Servidor HTTP/SSE con streaming en tiempo real compatible con OpenAI completions.
   - Persistencia local atómica de sesiones y memoria episódica (`data/sessions.json`, `data/relic_memory.json`).
   - Modo de ejecución dual: integración con el microkernel MCP en Rust y fallback autónomo soberano en JavaScript local.

3. **Frontend Conversacional HUD (`frontend/`)**:
   - SPA de alto rendimiento construida en **React 19**, **TypeScript** y **TailwindCSS** sobre **Vite**.
   - Inspirada en la ergonomía de **Gemini** con estética HUD Cyberpunk (fondos puros, acentos carmesí `#ff1f3d`, bordes angulares en puntas, cero dependencias externas y tipografía monoespaciada).
   - Navegación reactiva con rutas canónicas (`/`, `/c/:id`, `/memory-episodic`), panel lateral offcanvas y selector de cartuchos unificado.

---

## Inicio Rápido

### Opción 1: Orquestación Unificada con `run.py` (Recomendado)

El orquestador `run.py` verifica el entorno, compila dependencias pendientes y levanta los servicios coordinados en un panel de control interactivo:

```bash
python run.py
```

Puertos y puntos de enlace locales:
- **Frontend SPA:** [http://localhost:5173](http://localhost:5173)
- **Agentic Gateway:** [http://localhost:3000](http://localhost:3000)
- **RELIC Neural Engine:** [http://localhost:8080](http://localhost:8080)
- **Microkernel MCP Rust:** [http://localhost:5000](http://localhost:5000)

### Opción 2: Ejecución Desacoplada Manual

Si deseas ejecutar únicamente la capa de servicio y la interfaz web:

```bash
# 1. Iniciar Gateway MVC (Terminal 1)
cd agentic_gateway
npm start

# 2. Iniciar Frontend UI (Terminal 2)
cd frontend
npm run dev
```

---

## Documentación y Referencias

- **[Documentación Técnica y Endpoints](docs/README.md)**: Especificación de la API REST, eventos SSE y arquitectura interna.
- **[Catálogo de Skills del Entorno](docs/SKILLS.md)**: Registro exhaustivo de skills cognitivas y de desarrollo activas en el IDE.
- **[Agentic Gateway MVC](agentic_gateway/README.md)**: Modelos, controladores, vistas y suite de 22 pruebas unitarias.
- **[Frontend HUD](frontend/README.md)**: Componentes modulares, hooks de streaming y diseño de la interfaz.
