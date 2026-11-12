// Simple Domain — Enrutador Principal MVC (routes/router.mjs)
// Principio de Responsabilidad Única: Mapeo de rutas a controladores MVC.

import { setCorsHeaders, sendNoContent, sendError } from '../views/jsonView.mjs';
import { handleHealth } from '../controllers/healthController.mjs';
import {
  handleListSessions,
  handleCreateSession,
  handleGetSession,
  handleUpdateSessionTitle,
  handleDeleteSession,
  handleSessionMessages,
} from '../controllers/sessionController.mjs';
import {
  handleListMemories,
  handleCreateMemory,
  handleDeleteMemory,
} from '../controllers/memoryController.mjs';
import { handleListTools, handleExecuteTool } from '../controllers/toolController.mjs';
import { handleChatCompletion } from '../controllers/chatController.mjs';

export function createRouter({
  sessionStore,
  relicMemoryStore,
  slotPersistence,
  mcpClient,
  allTools,
  executeTool,
  quarantineDir,
  defaultSystemPrompt,
  relicEngineUrl,
  conversationalEngineUrl,
}) {
  return async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return sendNoContent(res);

    const parsedUrl = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

    // 1. Diagnóstico de Salud
    if (pathname === '/health' && req.method === 'GET') {
      return handleHealth(mcpClient, allTools, sessionStore, relicMemoryStore, res);
    }

    // 2. Sesiones
    if (pathname === '/v1/sessions' && req.method === 'GET') {
      return handleListSessions(sessionStore, res);
    }
    if (pathname === '/v1/sessions' && req.method === 'POST') {
      return handleCreateSession(sessionStore, req, res);
    }

    const sessionMatch = pathname.match(/^\/v1\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      if (req.method === 'GET') return handleGetSession(sessionStore, sessionId, parsedUrl, res);
      if (req.method === 'PATCH') return handleUpdateSessionTitle(sessionStore, sessionId, req, res);
      if (req.method === 'DELETE') return handleDeleteSession(sessionStore, slotPersistence, sessionId, res);
    }

    const messagesMatch = pathname.match(/^\/v1\/sessions\/([^/]+)\/messages$/);
    if (messagesMatch && req.method === 'POST') {
      return handleSessionMessages(sessionStore, messagesMatch[1], req, res);
    }

    // 3. Memoria Episódica
    if (pathname === '/v1/relic/memory' && req.method === 'GET') {
      return handleListMemories(relicMemoryStore, res);
    }
    if (pathname === '/v1/relic/memory' && req.method === 'POST') {
      return handleCreateMemory(relicMemoryStore, req, res);
    }

    const memMatch = pathname.match(/^\/v1\/relic\/memory\/([^/]+)$/);
    if (memMatch && req.method === 'DELETE') {
      return handleDeleteMemory(relicMemoryStore, memMatch[1], res);
    }

    // 4. Herramientas MCP
    if (pathname === '/v1/tools' && req.method === 'GET') {
      return handleListTools(allTools, res);
    }
    if (pathname === '/v1/tools/execute' && req.method === 'POST') {
      return handleExecuteTool({ req, res, executeTool, mcpClient, relicMemoryStore, quarantineDir });
    }

    // 5. Inferencia RELIC
    if (pathname === '/v1/chat/completions' && req.method === 'POST') {
      return handleChatCompletion({
        req,
        res,
        relicMemoryStore,
        slotPersistence,
        sessionStore,
        allTools,
        defaultSystemPrompt,
        relicEngineUrl,
        conversationalEngineUrl,
      });
    }

    return sendError(res, 404, 'Endpoint no encontrado');
  };
}

export const createRequestHandler = createRouter;
