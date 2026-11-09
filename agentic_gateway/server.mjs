// Simple Domain — Agentic Gateway & Session Manager (MVC Architecture)
// Bootstrap modularizado que coordina Modelos, Controladores y Adaptadores externos.
import http from 'node:http';
import fs from 'node:fs/promises';

import {
  PORT,
  HOST,
  RELIC_ENGINE_URL,
  RELIC_ENGINE_BASE_URL,
  SESSIONS_FILE,
  MEMORY_FILE,
  QUARANTINE_DIR,
  SLOTS_CACHE_DIR,
  MAX_SLOTS_CACHE_BYTES,
  KV_SAVE_TOKEN_THRESHOLD,
  DEFAULT_SYSTEM_PROMPT,
} from './config.mjs';

import { SessionModel } from './models/SessionModel.mjs';
import { MemoryModel } from './models/MemoryModel.mjs';
import { SlotModel } from './models/SlotModel.mjs';
import { LOCAL_TOOLS, executeTool } from './tools/index.mjs';
import { RelicMcpClient } from './mcpClient.mjs';
import { createRouter } from './routes/router.mjs';

async function startServer() {
  // 1. Inicializar Modelos de Dominio y Persistencia
  const sessionModel = new SessionModel(SESSIONS_FILE, DEFAULT_SYSTEM_PROMPT);
  const memoryModel = new MemoryModel(MEMORY_FILE);
  const slotModel = new SlotModel({
    relicEngineBaseUrl: RELIC_ENGINE_BASE_URL,
    cacheDir: SLOTS_CACHE_DIR,
    maxBytes: MAX_SLOTS_CACHE_BYTES,
    tokenThreshold: KV_SAVE_TOKEN_THRESHOLD,
  });

  await sessionModel.init();
  await memoryModel.init();
  await slotModel.init();

  try {
    await fs.mkdir(QUARANTINE_DIR, { recursive: true });
  } catch {}

  // 2. Conectar al Microkernel MCP en Rust (si el binario fue compilado)
  const mcpClient = new RelicMcpClient();
  let mcpActive = false;
  try {
    await mcpClient.start();
    mcpActive = true;
  } catch (err) {
    console.log('[Agentic Gateway] MCP Rust no disponible:', err.message);
  }

  // 3. Catálogo unificado de herramientas (Rust MCP + Locales)
  const allTools = [...LOCAL_TOOLS, ...mcpClient.getOpenAiToolsSchema()];

  // 4. Enrutador MVC
  const requestHandler = createRouter({
    sessionStore: sessionModel,
    relicMemoryStore: memoryModel,
    slotPersistence: slotModel,
    mcpClient,
    allTools,
    executeTool,
    quarantineDir: QUARANTINE_DIR,
    defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    relicEngineUrl: RELIC_ENGINE_URL,
  });

  const server = http.createServer(requestHandler);

  server.listen(PORT, HOST, () => {
    console.log(`[Agentic Gateway] En línea en http://${HOST}:${PORT}`);
    if (mcpActive) {
      console.log(`[Agentic Gateway] Microkernel MCP Rust conectado (${allTools.length} herramientas)`);
    } else {
      console.log(`[Agentic Gateway] Modo Soberano: ${LOCAL_TOOLS.length} herramientas locales JS activas`);
    }
    console.log(`[Agentic Gateway] Operación autónoma activa (con fallback local si ${RELIC_ENGINE_URL} no responde)`);
    console.log(`[Agentic Gateway] Sesiones: ${SESSIONS_FILE} | Memoria: ${MEMORY_FILE}`);
  });
}

startServer().catch((e) => {
  console.error('[Agentic Gateway] Error fatal:', e);
  process.exit(1);
});
