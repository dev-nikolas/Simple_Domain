// Simple Domain — Chat Controller
// Principio de Responsabilidad Única (SRP): Inferencia en streaming SSE con RELIC Engine.

import { initSSEStream, sendSSEDelta, sendSSEToolCall, sendSSEError, endSSEStream } from '../views/sseView.mjs';
import { dispatchLocalAutonomousChat } from './localCognitiveDispatcher.mjs';

export function handleChatCompletion({
  req,
  res,
  relicMemoryStore,
  slotPersistence,
  sessionStore,
  allTools,
  defaultSystemPrompt,
  relicEngineUrl,
}) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    try {
      const clientPayload = JSON.parse(body);
      const messages = [...(clientPayload.messages || [])];
      const sessionId = clientPayload.session_id;
      const maxTokens = clientPayload.max_tokens || 2048;
      const temperature = clientPayload.temperature ?? 0.1;

      // Inyectar contexto de memoria episódica al system prompt de RELIC
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

      initSSEStream(res);
      let accumulatedTotal = '';

      const enableTools = clientPayload.enable_tools === true || clientPayload.tools !== undefined;
      const toolsToSend = enableTools ? (clientPayload.tools || allTools) : undefined;

      const relicPayload = {
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      };
      if (toolsToSend && toolsToSend.length > 0) {
        relicPayload.tools = toolsToSend;
      }

      if (sessionId && slotPersistence) {
        await slotPersistence.restoreIfEvicted(sessionId);
      }

      let relicRes = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        relicRes = await fetch(relicEngineUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(relicPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!relicRes.ok) {
          relicRes = null;
        }
      } catch {
        // Motor C-Engine inactivo o puerto 8080 no levantado
        relicRes = null;
      }

      // Despacho autónomo local si el motor C no está activo
      if (!relicRes) {
        const lastUser = messages.filter((m) => m.role === 'user').pop();
        const prompt = lastUser?.content || '';
        await dispatchLocalAutonomousChat({
          res,
          prompt,
          cartridge: clientPayload.cartridge || 'auto',
          sessionId,
          sessionStore,
          relicMemoryStore,
        });
        return;
      }

      if (relicRes.body) {
        const reader = relicRes.body.getReader();
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

              if (payload === '[DONE]') break;

              try {
                const parsed = JSON.parse(payload);
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.content) {
                  accumulatedTotal += delta.content;
                  sendSSEDelta(res, delta.content);
                } else if (delta?.tool_calls) {
                  sendSSEToolCall(res, parsed);
                }
              } catch {
                // Buffer fragmentario
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      endSSEStream(res);

      if (sessionId && accumulatedTotal) {
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
          sessionStore.addMessage(sessionId, lastUserMsg);
        }
        sessionStore.addMessage(sessionId, {
          role: 'assistant',
          content: accumulatedTotal,
        });

        const totalChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + accumulatedTotal.length;
        const approxTokens = Math.round(totalChars / 4);
        if (slotPersistence) slotPersistence.scheduleSave(sessionId, approxTokens);
      }
    } catch (err) {
      console.error('[ChatController] Error procesando completions:', err);
      sendSSEError(res, err.message);
      endSSEStream(res);
    }
  });
}
