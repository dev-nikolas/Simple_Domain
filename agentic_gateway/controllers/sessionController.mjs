// Simple Domain — Session Controller
// Principio de Responsabilidad Única (SRP): Control de flujo para sesiones y mensajes.

import { sendJson, sendError, sendNoContent } from '../views/jsonView.mjs';
import { parseJsonBody } from '../utils/httpBodyParser.mjs';

export function handleListSessions(sessionStore, res) {
  return sendJson(res, 200, sessionStore.list());
}

export async function handleCreateSession(sessionStore, req, res) {
  const payload = await parseJsonBody(req, res);
  if (!payload) return;
  const created = sessionStore.create(payload);
  return sendJson(res, 201, created);
}

export function handleGetSession(sessionStore, sessionId, parsedUrl, res) {
  const limit = parsedUrl.searchParams.get('limit');
  const offset = parsedUrl.searchParams.get('offset');
  const s = sessionStore.get(sessionId, limit, offset);
  if (!s) return sendError(res, 404, 'Sesión no encontrada');
  return sendJson(res, 200, s);
}

export async function handleUpdateSessionTitle(sessionStore, sessionId, req, res) {
  const payload = await parseJsonBody(req, res);
  if (!payload) return;
  if (!payload.title) return sendError(res, 400, 'Campo title requerido');
  const updated = sessionStore.updateTitle(sessionId, payload.title);
  if (!updated) return sendError(res, 404, 'Sesión no encontrada');
  return sendJson(res, 200, updated);
}

export async function handleDeleteSession(sessionStore, slotPersistence, sessionId, res) {
  const deleted = sessionStore.delete(sessionId);
  if (!deleted) return sendError(res, 404, 'Sesión no encontrada');
  await slotPersistence.deleteSnapshot(sessionId);
  return sendNoContent(res);
}

export async function handleSessionMessages(sessionStore, sessionId, req, res) {
  const payload = await parseJsonBody(req, res);
  if (!payload) return;
  if (Array.isArray(payload.messages)) {
    const updated = sessionStore.syncSessionMessages(sessionId, payload.messages);
    return sendJson(res, 200, updated);
  }
  if (payload.role && payload.content !== undefined) {
    const updated = sessionStore.addMessage(sessionId, {
      role: payload.role,
      content: payload.content,
    });
    return sendJson(res, 201, updated);
  }
  return sendError(res, 400, 'Payload debe incluir messages[] o role y content');
}
