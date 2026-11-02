// Simple Domain — Agentic Gateway & Session Manager
// Monorrepo: Gateway Node.js + Microkernel RELIC MCP + LLM Engine SSE Streaming

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { RelicMcpClient } from './mcpClient.mjs';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const LLAMA_URL = process.env.LLAMA_URL || 'http://127.0.0.1:8081/v1/chat/completions';
const SESSIONS_FILE = process.env.SESSIONS_FILE || path.resolve(process.cwd(), 'data', 'sessions.json');

const DEFAULT_SYSTEM_PROMPT = 'Eres un experto dev. Responde directo, sin preámbulos y solo con el código necesario.';

// ==============================================================================
// Almacén Persistente de Sesiones (JSON Atómico con Flush Debounced)
// ==============================================================================
class SessionStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.sessions = new Map();
    this.saveTimeout = null;
    this.isDirty = false;
  }

  async init() {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const s of list) {
          if (s && s.id) {
            this.sessions.set(s.id, s);
          }
        }
      }
      console.log(`[SessionStore] ${this.sessions.size} sesiones cargadas desde ${this.filePath}`);
    } catch {
      console.log(`[SessionStore] Inicializando nuevo almacén en ${this.filePath}`);
    }

    if (this.sessions.size === 0) {
      const defaultId = Date.now().toString();
      this.sessions.set(defaultId, {
        id: defaultId,
        title: 'Nueva Conversación',
        messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
        updatedAt: Date.now(),
      });
      this.scheduleSave();
    }
  }

  scheduleSave() {
    this.isDirty = true;
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(async () => {
      this.saveTimeout = null;
      if (!this.isDirty) return;
      this.isDirty = false;
      try {
        const list = Array.from(this.sessions.values());
        const tempPath = `${this.filePath}.${Date.now()}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(list, null, 2), 'utf-8');
        await fs.rename(tempPath, this.filePath);
      } catch (err) {
        console.error('[SessionStore] Error guardando sesiones en disco:', err);
      }
    }, 400);
  }

  list() {
    return Array.from(this.sessions.values())
      .map((s) => ({
        id: s.id,
        title: s.title || 'Nueva Conversación',
        updatedAt: s.updatedAt || Date.now(),
        messageCount: (s.messages || []).filter((m) => m.role !== 'system').length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  get(id, limit, offset) {
    const s = this.sessions.get(id);
    if (!s) return null;
    let msgs = s.messages || [];
    if (offset !== undefined || limit !== undefined) {
      const off = Math.max(0, parseInt(offset || '0', 10));
      const lim = Math.max(1, parseInt(limit || '100', 10));
      msgs = msgs.slice(off, off + lim);
    }
    return { ...s, messages: msgs };
  }

  create(data = {}) {
    const id = data.id || Date.now().toString();
    const title = data.title || 'Nueva Conversación';
    const messages = Array.isArray(data.messages) && data.messages.length > 0
      ? data.messages
      : [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }];

    const session = {
      id,
      title,
      messages,
      updatedAt: Date.now(),
    };
    this.sessions.set(id, session);
    this.scheduleSave();
    return session;
  }

  updateTitle(id, title) {
    const s = this.sessions.get(id);
    if (!s) return null;
    s.title = title.trim();
    s.updatedAt = Date.now();
    this.scheduleSave();
    return s;
  }

  delete(id) {
    const existed = this.sessions.delete(id);
    if (existed) {
      if (this.sessions.size === 0) {
        this.create({ title: 'Nueva Conversación' });
      }
      this.scheduleSave();
    }
    return existed;
  }

  addMessage(id, message) {
    let s = this.sessions.get(id);
    if (!s) {
      s = this.create({ id });
    }
    if (!s.messages) s.messages = [];
    s.messages.push(message);
    s.updatedAt = Date.now();

    if (s.title === 'Nueva Conversación' && message.role === 'user') {
      const clean = (message.content || '').trim().replace(/\n+/g, ' ');
      if (clean) {
        s.title = clean.length > 36 ? clean.substring(0, 36) + '...' : clean;
      }
    }
    this.scheduleSave();
    return s;
  }

  syncSessionMessages(id, messages) {
    let s = this.sessions.get(id);
    if (!s) {
      s = this.create({ id, messages });
      return s;
    }
    s.messages = messages;
    s.updatedAt = Date.now();
    if (s.title === 'Nueva Conversación') {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      if (firstUserMsg && firstUserMsg.content.trim()) {
        const clean = firstUserMsg.content.trim().replace(/\n+/g, ' ');
        s.title = clean.length > 36 ? clean.substring(0, 36) + '...' : clean;
      }
    }
    this.scheduleSave();
    return s;
  }
}

const sessionStore = new SessionStore(SESSIONS_FILE);
const mcpClient = new RelicMcpClient();

// Herramienta nativa para inspección de código local
const LOCAL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_code_file',
      description: 'Lee el contenido de un archivo de código fuente local en el proyecto.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta relativa o absoluta del archivo a leer',
          },
        },
        required: ['path'],
      },
    },
  },
];

async function executeTool(name, args) {
  if (name === 'read_code_file') {
    try {
      const filePath = path.resolve(args.path);
      const content = await fs.readFile(filePath, 'utf-8');
      return { content: [{ type: 'text', text: content }], isError: false };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error leyendo archivo: ${e.message}` }], isError: true };
    }
  }
  return await mcpClient.callTool(name, args);
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ==============================================================================
// Servidor HTTP Principal
// ==============================================================================
async function startServer() {
  await sessionStore.init();
  await mcpClient.start();

  const allTools = [...LOCAL_TOOLS, ...mcpClient.getOpenAiToolsSchema()];

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

    // 1. Diagnóstico de Salud
    if (pathname === '/health' && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        mcp: mcpClient.isInitialized,
        toolsCount: allTools.length,
        sessionsCount: sessionStore.sessions.size,
      });
    }

    // 2. Colección de Sesiones: Listar y Crear
    if (pathname === '/v1/sessions' && req.method === 'GET') {
      return sendJson(res, 200, sessionStore.list());
    }

    if (pathname === '/v1/sessions' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const created = sessionStore.create(payload);
          return sendJson(res, 201, created);
        } catch (e) {
          return sendJson(res, 400, { error: 'JSON malformado' });
        }
      });
      return;
    }

    // 3. Sesión Individual: Leer, Renombrar, Eliminar
    const sessionMatch = pathname.match(/^\/v1\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];

      if (req.method === 'GET') {
        const limit = parsedUrl.searchParams.get('limit');
        const offset = parsedUrl.searchParams.get('offset');
        const s = sessionStore.get(sessionId, limit, offset);
        if (!s) return sendJson(res, 404, { error: 'Sesión no encontrada' });
        return sendJson(res, 200, s);
      }

      if (req.method === 'PATCH') {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            if (!payload.title) return sendJson(res, 400, { error: 'Campo title requerido' });
            const updated = sessionStore.updateTitle(sessionId, payload.title);
            if (!updated) return sendJson(res, 404, { error: 'Sesión no encontrada' });
            return sendJson(res, 200, updated);
          } catch {
            return sendJson(res, 400, { error: 'JSON malformado' });
          }
        });
        return;
      }

      if (req.method === 'DELETE') {
        const deleted = sessionStore.delete(sessionId);
        if (!deleted) return sendJson(res, 404, { error: 'Sesión no encontrada' });
        res.writeHead(204);
        res.end();
        return;
      }
    }

    // 4. Mensajes de Sesión: Agregar o Sincronizar
    const messagesMatch = pathname.match(/^\/v1\/sessions\/([^/]+)\/messages$/);
    if (messagesMatch && req.method === 'POST') {
      const sessionId = messagesMatch[1];
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
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
          return sendJson(res, 400, { error: 'Payload debe incluir messages[] o role y content' });
        } catch {
          return sendJson(res, 400, { error: 'JSON malformado' });
        }
      });
      return;
    }

    // 5. Inferencia LLM con Streaming SSE y Tool Calling
    if (pathname === '/v1/chat/completions' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const clientPayload = JSON.parse(body);
          const messages = [...(clientPayload.messages || [])];
          const sessionId = clientPayload.session_id;
          const maxTokens = clientPayload.max_tokens || 2048;
          const temperature = clientPayload.temperature ?? 0.1;

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          });

          const sendSSEDelta = (text) => {
            const chunk = {
              choices: [{ delta: { content: text }, finish_reason: null }],
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          };

          let accumulatedTotal = '';

          // Solo enviar definiciones de herramientas a llama-server si el cliente las solicita explícitamente.
          // Evita inflar artificialmente el prompt prefill con esquemas JSON en chats de texto y código normal.
          const enableTools = clientPayload.enable_tools === true || clientPayload.tools !== undefined;
          const toolsToSend = enableTools ? (clientPayload.tools || allTools) : undefined;

          const llamaPayload = {
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          };
          if (toolsToSend && toolsToSend.length > 0) {
            llamaPayload.tools = toolsToSend;
          }

          // Transmitimos token por token directamente desde llama-server
          const llamaRes = await fetch(LLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(llamaPayload),
          });

          if (!llamaRes.ok) {
            const err = await llamaRes.text();
            sendSSEDelta(`\n[Error de inferencia en motor LLM: ${err}]`);
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }

          if (llamaRes.body) {
            const reader = llamaRes.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith('data: ')) continue;
                  const payload = trimmed.slice(6).trim();

                  if (payload === '[DONE]') {
                    break;
                  }

                  try {
                    const parsed = JSON.parse(payload);
                    const delta = parsed.choices?.[0]?.delta;
                    if (delta?.content) {
                      accumulatedTotal += delta.content;
                      sendSSEDelta(delta.content);
                    } else if (delta?.tool_calls) {
                      res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                    }
                  } catch {
                    // Fragmento incompleto en tránsito
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }
          }

          res.write('data: [DONE]\n\n');
          res.end();

          // Si se proporcionó session_id, persistir automáticamente en el Gateway
          if (sessionId && accumulatedTotal) {
            const lastUserMsg = messages[messages.length - 1];
            if (lastUserMsg && lastUserMsg.role === 'user') {
              sessionStore.addMessage(sessionId, lastUserMsg);
            }
            sessionStore.addMessage(sessionId, {
              role: 'assistant',
              content: accumulatedTotal,
            });
          }
        } catch (err) {
          console.error('[Gateway] Error procesando completions:', err);
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
  });

  server.listen(PORT, HOST, () => {
    console.log(`[Agentic Gateway] En línea en http://${HOST}:${PORT}`);
    console.log(`[Agentic Gateway] Sesiones persistentes activas en ${SESSIONS_FILE}`);
  });
}

startServer().catch((e) => {
  console.error('[Agentic Gateway] Error fatal:', e);
  process.exit(1);
});
