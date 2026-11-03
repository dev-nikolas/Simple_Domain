// Simple Domain — Agentic Gateway & Session Manager
// Arquitectura Modular: Orquestador Node.js + Microkernel RELIC MCP en Rust + LLM Engine
import http from 'node:http';
import fs from 'node:fs/promises';

import {
  PORT,
  HOST,
  LLAMA_URL,
  LLAMA_BASE_URL,
  SESSIONS_FILE,
  MEMORY_FILE,
  QUARANTINE_DIR,
  SLOTS_CACHE_DIR,
  MAX_SLOTS_CACHE_BYTES,
  KV_SAVE_TOKEN_THRESHOLD,
  DEFAULT_SYSTEM_PROMPT,
} from './config.mjs';

import { SlotPersistenceManager } from './slotPersistence.mjs';
import { SessionStore } from './sessionStore.mjs';
import { RelicMemoryStore } from './memoryStore.mjs';
import { RelicMcpClient } from './mcpClient.mjs';
import { LOCAL_TOOLS, executeTool } from './tools.mjs';
import { createRequestHandler } from './routes.mjs';

async function startServer() {
  // 1. Inicializar almacenes persistentes y carpetas operativas
  const sessionStore = new SessionStore(SESSIONS_FILE, DEFAULT_SYSTEM_PROMPT);
  const relicMemoryStore = new RelicMemoryStore(MEMORY_FILE);
  const slotPersistence = new SlotPersistenceManager({
    llamaBaseUrl: LLAMA_BASE_URL,
    cacheDir: SLOTS_CACHE_DIR,
    maxBytes: MAX_SLOTS_CACHE_BYTES,
    tokenThreshold: KV_SAVE_TOKEN_THRESHOLD,
  });

  await sessionStore.init();
  await relicMemoryStore.init();
  await slotPersistence.init();

  try {
    await fs.mkdir(QUARANTINE_DIR, { recursive: true });
  } catch {}

  // 2. Conectar al Servidor MCP de RELIC en Rust
  const mcpClient = new RelicMcpClient();
  try {
    await mcpClient.start();
  } catch (err) {
    console.warn('[Agentic Gateway] Advertencia al conectar con Servidor MCP Rust (se usarán fallbacks locales):', err.message);
  }

  // 3. Catálogo unificado de herramientas (Rust MCP + Locales)
  const allTools = [...LOCAL_TOOLS, ...mcpClient.getOpenAiToolsSchema()];

  // 4. Crear enrutador HTTP modularizado
  const requestHandler = createRequestHandler({
    sessionStore,
    relicMemoryStore,
    slotPersistence,
    mcpClient,
    allTools,
    executeTool,
    quarantineDir: QUARANTINE_DIR,
    defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    llamaUrl: LLAMA_URL,
  });

  const server = http.createServer(requestHandler);

  server.listen(PORT, HOST, () => {
    console.log(`[Agentic Gateway] En línea en http://${HOST}:${PORT}`);
    console.log(`[Agentic Gateway] MCP Rust activo con ${allTools.length} herramientas`);
    console.log(`[Agentic Gateway] Sesiones en ${SESSIONS_FILE} | Memoria en ${MEMORY_FILE}`);
  });
}

startServer().catch((e) => {
  console.error('[Agentic Gateway] Error fatal:', e);
  process.exit(1);
});
