// Simple Domain — Health Controller
// Principio de Responsabilidad Única (SRP): Diagnóstico de salud y métricas.

import { renderHealth } from '../views/healthView.mjs';

export function handleHealth(mcpClient, allTools, sessionStore, relicMemoryStore, res) {
  return renderHealth(res, {
    mcpInitialized: mcpClient.isInitialized,
    toolsCount: allTools.length,
    sessionsCount: sessionStore.sessions.size,
    memoriesCount: relicMemoryStore.getAll().length,
  });
}

