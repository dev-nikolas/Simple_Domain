// Simple Domain — Memory Controller
// Principio de Responsabilidad Única (SRP): Control de flujo para memoria episódica.

import { sendJson, sendError } from '../views/jsonView.mjs';

export function handleListMemories(relicMemoryStore, res) {
  return sendJson(res, 200, relicMemoryStore.getAll());
}

export function handleCreateMemory(relicMemoryStore, req, res) {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      if (!payload.topic || !payload.conclusion) {
        return sendError(res, 400, 'Campos topic y conclusion requeridos');
      }
      const created = await relicMemoryStore.add(payload.topic, payload.conclusion);
      return sendJson(res, 201, created);
    } catch {
      return sendError(res, 400, 'JSON malformado');
    }
  });
}

export async function handleDeleteMemory(relicMemoryStore, memId, res) {
  const deleted = await relicMemoryStore.delete(memId);
  if (!deleted) return sendError(res, 404, 'Memoria no encontrada');
  return sendJson(res, 200, { success: true, deleted });
}
