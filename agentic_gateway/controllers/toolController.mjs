// Simple Domain — Tool Controller
// Principio de Responsabilidad Única (SRP): Peticiones sobre el catálogo y ejecución de herramientas.

import { sendJson, sendError } from '../views/jsonView.mjs';

export function handleListTools(allTools, res) {
  return sendJson(res, 200, allTools);
}

export function handleExecuteTool({ req, res, executeTool, mcpClient, relicMemoryStore, quarantineDir }) {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      if (!payload.name) return sendError(res, 400, 'Campo name requerido');
      const result = await executeTool(payload.name, payload.arguments || {}, {
        mcpClient,
        relicMemoryStore,
        quarantineDir,
      });
      return sendJson(res, 200, result);
    } catch (e) {
      return sendError(res, 500, e.message);
    }
  });
}

