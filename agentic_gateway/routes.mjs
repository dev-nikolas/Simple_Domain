// Simple Domain — Enrutador HTTP del Agentic Gateway
export function createRequestHandler({
  sessionStore,
  relicMemoryStore,
  slotPersistence,
  mcpClient,
  allTools,
  executeTool,
  quarantineDir,
  defaultSystemPrompt,
  llamaUrl,
}) {
  function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  return async (req, res) => {
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
        memoriesCount: relicMemoryStore.getAll().length,
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
        } catch {
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
        await slotPersistence.deleteSnapshot(sessionId);
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

    // 5. Memoria Episódica Persistente de RELIC (relic_memory.json)
    if (pathname === '/v1/relic/memory' && req.method === 'GET') {
      return sendJson(res, 200, relicMemoryStore.getAll());
    }

    if (pathname === '/v1/relic/memory' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          if (!payload.topic || !payload.conclusion) {
            return sendJson(res, 400, { error: 'Campos topic y conclusion requeridos' });
          }
          const created = await relicMemoryStore.add(payload.topic, payload.conclusion);
          return sendJson(res, 201, created);
        } catch {
          return sendJson(res, 400, { error: 'JSON malformado' });
        }
      });
      return;
    }

    const memMatch = pathname.match(/^\/v1\/relic\/memory\/([^/]+)$/);
    if (memMatch && req.method === 'DELETE') {
      const memId = memMatch[1];
      const deleted = await relicMemoryStore.delete(memId);
      if (!deleted) return sendJson(res, 404, { error: 'Memoria no encontrada' });
      return sendJson(res, 200, { success: true, deleted });
    }

    // 6. Ejecución Directa de Herramientas (Tool Execution API)
    if (pathname === '/v1/tools/execute' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          if (!payload.name) return sendJson(res, 400, { error: 'Campo name requerido' });
          const result = await executeTool(payload.name, payload.arguments || {}, {
            mcpClient,
            relicMemoryStore,
            quarantineDir,
          });
          return sendJson(res, 200, result);
        } catch (e) {
          return sendJson(res, 500, { error: e.message });
        }
      });
      return;
    }

    // 7. Inferencia LLM con Streaming SSE, Personalidad RELIC y Tool Calling
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

          // Asegurar la personalidad de RELIC y adjuntar el contexto de memoria episódica
          const memoryContext = relicMemoryStore.getSystemPromptMemoryContext();
          const systemIndex = messages.findIndex((m) => m.role === 'system');

          if (systemIndex === -1) {
            messages.unshift({
              role: 'system',
              content: `${defaultSystemPrompt}${memoryContext}`,
            });
          } else {
            let content = messages[systemIndex].content || '';
            if (!content.includes('Tu nombre es RELIC')) {
              content = `${defaultSystemPrompt}\n\n${content}`;
            }
            if (memoryContext && !content.includes('[MEMORIA EPISÓDICA')) {
              content = `${content}${memoryContext}`;
            }
            messages[systemIndex].content = content;
          }

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

          // Solo enviar definiciones de herramientas si se solicitan
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

          // Si la sesión fue desalojada y existe un snapshot en disco, restaurar en un slot libre
          if (sessionId) {
            await slotPersistence.restoreIfEvicted(sessionId);
          }

          // Transmitir token a token directamente desde llama-server
          const llamaRes = await fetch(llamaUrl, {
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

          // Persistir automáticamente en SessionStore y en disco si se indicó session_id
          if (sessionId && accumulatedTotal) {
            const lastUserMsg = messages[messages.length - 1];
            if (lastUserMsg && lastUserMsg.role === 'user') {
              sessionStore.addMessage(sessionId, lastUserMsg);
            }
            sessionStore.addMessage(sessionId, {
              role: 'assistant',
              content: accumulatedTotal,
            });

            // Programar guardado debounced del KV en disco si supera el umbral de tokens
            const totalChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + accumulatedTotal.length;
            const approxTokens = Math.round(totalChars / 4);
            slotPersistence.scheduleSave(sessionId, approxTokens);
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
  };
}

