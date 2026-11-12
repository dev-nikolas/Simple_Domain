// Simple Domain — Tool Controller
// Principio de Responsabilidad Única (SRP): Peticiones sobre el catálogo y ejecución de herramientas.

import { sendJson, sendError } from '../views/jsonView.mjs';
import { parseJsonBody } from '../utils/httpBodyParser.mjs';

export function handleListTools(allTools, res) {
  return sendJson(res, 200, allTools);
}

export async function handleExecuteTool({ req, res, executeTool, mcpClient, relicMemoryStore, quarantineDir }) {
  const payload = await parseJsonBody(req, res);
  if (!payload) return;
  if (!payload.name) return sendError(res, 400, 'Campo name requerido');
  try {
    const result = await executeTool(payload.name, payload.arguments || {}, {
      mcpClient,
      relicMemoryStore,
      quarantineDir,
    });
    return sendJson(res, 200, result);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

