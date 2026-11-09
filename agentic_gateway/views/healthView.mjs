// Simple Domain — Health Diagnostics View
// Principio de Responsabilidad Única (SRP): Presentación del estado del sistema.

import { sendJson } from './jsonView.mjs';

export function renderHealth(res, { mcpInitialized, toolsCount, sessionsCount, memoriesCount }) {
  return sendJson(res, 200, {
    status: 'ok',
    engine: 'RELIC-project',
    mcp: Boolean(mcpInitialized),
    toolsCount: toolsCount || 0,
    sessionsCount: sessionsCount || 0,
    memoriesCount: memoriesCount || 0,
    timestamp: new Date().toISOString(),
  });
}

