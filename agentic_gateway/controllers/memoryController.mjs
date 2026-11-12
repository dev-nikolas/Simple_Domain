// Simple Domain — Memory Controller
// Principio de Responsabilidad Única (SRP): Control de flujo para memoria episódica.

import { sendJson, sendError } from '../views/jsonView.mjs';
import { parseJsonBody } from '../utils/httpBodyParser.mjs';

export function handleListMemories(relicMemoryStore, res) {
  return sendJson(res, 200, relicMemoryStore.getAll());
}

export async function handleCreateMemory(relicMemoryStore, req, res) {
  const payload = await parseJsonBody(req, res);
  if (!payload) return;
  if (!payload.topic || !payload.conclusion) {
    return sendError(res, 400, 'Campos topic y conclusion requeridos');
  }
  try {
    const created = await relicMemoryStore.add(payload.topic, payload.conclusion);
    return sendJson(res, 201, created);
  } catch (err) {
    return sendError(res, 500, `Error guardando memoria: ${err.message}`);
  }
}

export async function handleDeleteMemory(relicMemoryStore, memId, res) {
  try {
    const deleted = await relicMemoryStore.delete(memId);
    if (!deleted) return sendError(res, 404, 'Memoria no encontrada');
    return sendJson(res, 200, { success: true, deleted });
  } catch (err) {
    return sendError(res, 500, `Error eliminando memoria: ${err.message}`);
  }
}
