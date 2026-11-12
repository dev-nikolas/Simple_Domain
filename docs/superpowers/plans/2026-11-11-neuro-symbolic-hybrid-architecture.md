# Implementación de la Arquitectura Híbrida Neuro-Simbólica (Nivel 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar una arquitectura desacoplada en tres capas (Router & Memoria en Capa 1, Compilador Semántico RIR en Capa 2 y Motor Conversacional SLM en Capa 3 con fallback seguro) en `Simple_Domain/agentic_gateway`.

**Architecture:** El `agentic_gateway` se convierte en un despachador cognitivo tri-modal:
1. **Capa 1**: Evaluación léxica ultrarrápida para saludos y memoria (< 2 ms, 0% CPU).
2. **Capa 2**: Aislamiento RIR hacia el modelo nano (puerto 8080) forzando plantillas JSON estrictas sin CoT en lenguaje natural (máx 32 tokens, temp 0.0).
3. **Capa 3**: Inferencia conversacional hacia un SLM local (puerto 8081) con timeout estricto y fallback autónomo a contingencia segura sin delegar charla abierta al modelo nano.

**Tech Stack:** Node.js (ESM), HTTP/SSE streaming, regex/análisis heurístico léxico, JSON schema slot compiler.

**Spec:** Opción A aprobada en el diagnóstico profundo de RELIC Engine y Simple Domain.

## Global Constraints

- Prohibido mezclar prompts de razonamiento en lenguaje natural (CoT) con las peticiones dirigidas al modelo nano de 10M–25M.
- El modelo nano únicamente procesa extracción de slots RIR en JSON delimitado (`{"action": "...", "slots": {...}}`).
- La consulta al motor conversacional (puerto 8081) debe tener un timeout estricto de $\le 3500\text{ ms}$ para no bloquear la experiencia de usuario.
- Si el puerto 8081 no responde, la contingencia autónoma debe responder en lenguaje natural claro y conciso, jamás reenviando la consulta al modelo nano.

## Review Focus

1. **Puerto 8081 inaccesible (servidor apagado o caído)**: No debe colgar el gateway; debe caer de inmediato en la contingencia local sin lanzar excepciones no controladas.
2. **Consulta RIR con prompt ruidoso**: El compilador de slots debe limpiar el prompt antes de pasarlo al modelo nano y limitar `max_tokens` a 32.
3. **Manejo de SSE en relay conversacional**: Los eventos `data: {...}` recibidos del puerto 8081 deben reenviarse en tiempo real y cerrarse limpiamente con `[DONE]`.
4. **Preservación de sesiones y memoria**: Las respuestas de todas las capas deben persistirse adecuadamente en `SessionModel` y `MemoryModel`.
5. **No interferencia con herramientas locales**: Las llamadas a herramientas del catálogo deben seguir funcionando normalmente.

---

### Task 1: Inyección de Variables de Entorno y Plomería del Gateway

**Files:**
- Modify: `Simple_Domain/agentic_gateway/config.mjs`
- Modify: `Simple_Domain/agentic_gateway/server.mjs`
- Modify: `Simple_Domain/agentic_gateway/routes/router.mjs`
- Test: `Simple_Domain/agentic_gateway/tests/config.test.mjs`

**Interfaces:**
- Produces: `CONVERSATIONAL_ENGINE_URL`, `CONVERSATIONAL_SERVER_URL` exportadas en `config.mjs` y pasadas al enrutador.

- [x] **Step 1: Escribir el test de configuración**
  Crear `Simple_Domain/agentic_gateway/tests/config.test.mjs` verificando que `CONVERSATIONAL_ENGINE_URL` apunte por defecto a `http://127.0.0.1:8081/v1/chat/completions`.
- [x] **Step 2: Ejecutar el test para comprobar fallo**
  Ejecutar `node --test Simple_Domain/agentic_gateway/tests/config.test.mjs` y verificar fallo por export inexistente.
- [x] **Step 3: Implementar variables en `config.mjs` y propagar en `server.mjs` y `router.mjs`**
  Exportar `CONVERSATIONAL_SERVER_URL` y `CONVERSATIONAL_ENGINE_URL`.
- [x] **Step 4: Re-ejecutar el test y comprobar que pasa**

---

### Task 2: Enrutador Cognitivo Heurístico (Capa 1)

**Files:**
- Create: `Simple_Domain/agentic_gateway/controllers/cognitiveRouter.mjs`
- Test: `Simple_Domain/agentic_gateway/tests/cognitiveRouter.test.mjs`

**Interfaces:**
- Produces: `classifyQueryIntent(prompt, cartridge)` -> `'GREETING' | 'RIR_SLOTS' | 'CONVERSATIONAL'`

- [x] **Step 1: Escribir el test de clasificación de intenciones**
  Crear `tests/cognitiveRouter.test.mjs` con casos de prueba para:
  - Saludos ("hola", "buenas tardes") -> `'GREETING'`
  - Intención formal/RIR (cartridge='rir', comandos de análisis estructurado, extracción de grafos/aritmética) -> `'RIR_SLOTS'`
  - Charla abierta ("explícame cómo funciona un mutex", "¿qué opinas de rust?") -> `'CONVERSATIONAL'`
- [x] **Step 2: Ejecutar el test y comprobar fallo**
  Ejecutar `node --test Simple_Domain/agentic_gateway/tests/cognitiveRouter.test.mjs`
- [x] **Step 3: Implementar `cognitiveRouter.mjs`**
  Lógica de coincidencia de patrones y expresiones regulares de alta velocidad sin llamadas asíncronas ni I/O bloqueante.
- [x] **Step 4: Re-ejecutar el test y verificar que pasa**

---

### Task 3: Aislamiento RIR y Compilador Semántico de Slots (Capa 2)

**Files:**
- Create: `Simple_Domain/agentic_gateway/controllers/rirSlotCompiler.mjs`
- Test: `Simple_Domain/agentic_gateway/tests/rirSlotCompiler.test.mjs`

**Interfaces:**
- Produces: `buildRirSlotPrompt(userPrompt)` -> Prompt formateado con plantilla few-shot estricta para JSON.
- Produces: `extractRirJson(modelOutput)` -> Objeto `{ action, slots }` limpio o fallback a `{ action: "unknown", slots: {} }`.

- [x] **Step 1: Escribir el test de compilación y extracción RIR**
  Crear `tests/rirSlotCompiler.test.mjs` validando que el prompt generado no contenga CoT (`[OBSERVACIÓN]`, `<think>`) y que solo admita salida JSON.
- [x] **Step 2: Ejecutar el test y comprobar fallo**
- [x] **Step 3: Implementar `rirSlotCompiler.mjs`**
- [x] **Step 4: Re-ejecutar el test y verificar que pasa**

---

### Task 4: Despachador Conversacional SLM con Fallback Autónomo (Capa 3) e Integración

**Files:**
- Create: `Simple_Domain/agentic_gateway/controllers/conversationalDispatcher.mjs`
- Modify: `Simple_Domain/agentic_gateway/controllers/chatController.mjs`
- Test: `Simple_Domain/agentic_gateway/tests/hybrid_integration.test.mjs`

**Interfaces:**
- Produces: `dispatchConversationalStream({ req, res, payload, conversationalEngineUrl, onFallback })`
- Modifies: `handleChatCompletion` para integrar las 3 capas en secuencia.

- [x] **Step 1: Escribir el test de integración híbrida**
  Crear `tests/hybrid_integration.test.mjs` que simule:
  - Saludo -> Respuesta instantánea Capa 1.
  - Petición conversacional con puerto 8081 apagado -> Respuesta de contingencia autónoma de Capa 3 sin llamar a 8080.
  - Petición RIR -> Formateo acotado hacia Capa 2.
- [x] **Step 2: Ejecutar el test y comprobar fallo**
- [x] **Step 3: Implementar `conversationalDispatcher.mjs` y actualizar `chatController.mjs`**
- [x] **Step 4: Ejecutar toda la suite de pruebas (`npm test`) y verificar que todos los frentes pasan**
