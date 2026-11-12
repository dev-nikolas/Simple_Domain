// Simple Domain — Despachador Conversacional SLM (Capa 3)
// Responsabilidad Única: Comunicación con el motor conversacional externo (puerto 8081).
// Emisión en streaming SSE en tiempo real y detección rápida de indisponibilidad con timeout estricto.

import { sendSSEDelta, sendSSEToolCall } from '../views/sseView.mjs';

const STOP_SEQUENCES = [
  "<|im_end|>",
  "<|endoftext|>",
  "<|eot_id|>",
  "<｜end of sentence｜>",
  "<｜begin of sentence｜>",
  "<｜end of sentence｜>",
  "<｜begin of sentence｜>",
  "end of sentence",
  "begin of sentence"
];

/**
 * Procesa un flujo de eventos SSE upstream emitiendo deltas de forma segura con ventana deslizante.
 * @param {ReadableStreamDefaultReader} reader
 * @param {import('node:http').ServerResponse} res
 * @param {string[]} [stopSequences]
 * @returns {Promise<string>}
 */
export async function processSseStream(reader, res, stopSequences = STOP_SEQUENCES) {
  let accumulatedTotal = '';
  const decoder = new TextDecoder('utf-8');
  let sseLineBuffer = '';
  let streamBuffer = '';
  const MAX_STOP_LEN = 36;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (streamBuffer.length > 0) {
          sendSSEDelta(res, streamBuffer);
          accumulatedTotal += streamBuffer;
          streamBuffer = '';
        }
        break;
      }

      sseLineBuffer += decoder.decode(value, { stream: true });
      const lines = sseLineBuffer.split('\n');
      sseLineBuffer = lines.pop() || '';

      let shouldBreakStream = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6).trim();

        if (dataStr === '[DONE]') {
          shouldBreakStream = true;
          break;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            streamBuffer += (delta.content ?? '');

            let stopIdx = -1;
            for (const seq of stopSequences) {
              const idx = streamBuffer.indexOf(seq);
              if (idx !== -1 && (stopIdx === -1 || idx < stopIdx)) {
                stopIdx = idx;
              }
            }

            if (stopIdx !== -1) {
              const finalPiece = streamBuffer.substring(0, stopIdx);
              if (finalPiece.length > 0) {
                sendSSEDelta(res, finalPiece);
                accumulatedTotal += finalPiece;
              }
              streamBuffer = '';
              reader.cancel().catch(() => {});
              shouldBreakStream = true;
              break;
            }

            let holdBack = 0;
            const maxCheck = Math.min(streamBuffer.length, MAX_STOP_LEN - 1);
            for (let len = maxCheck; len > 0; len--) {
              const suffix = streamBuffer.slice(-len);
              if (stopSequences.some((seq) => seq.startsWith(suffix))) {
                holdBack = len;
                break;
              }
            }

            const safeToEmit = streamBuffer.slice(0, streamBuffer.length - holdBack);
            if (safeToEmit.length > 0) {
              sendSSEDelta(res, safeToEmit);
              accumulatedTotal += safeToEmit;
              streamBuffer = streamBuffer.slice(safeToEmit.length);
            }
          } else if (delta?.tool_calls) {
            sendSSEToolCall(res, parsed);
          }
        } catch (err) {
          if (err instanceof SyntaxError) {
            // Chunk fragmentario: continuar acumulando en buffer
            continue;
          }
          console.error('[ConversationalDispatcher] Error crítico en procesamiento de delta SSE:', err);
          throw err;
        }
      }

      if (shouldBreakStream) break;
    }
    return accumulatedTotal;
  } finally {
    try {
      reader.releaseLock();
    } catch (err) {
      void err;
    }
  }
}

/**
 * Despacha la consulta al motor conversacional (ej. Qwen2.5-0.5B / Llama-3.2-1B vía llama.cpp).
 * @param {object} params
 * @param {import('node:http').ServerResponse} params.res
 * @param {Array} params.messages
 * @param {number} [params.maxTokens]
 * @param {number} [params.temperature]
 * @param {string} params.conversationalEngineUrl
 * @param {number} [params.timeoutMs]
 * @returns {Promise<{ success: boolean, accumulatedTotal: string }>}
 */
export async function dispatchConversationalStream({
  res,
  messages,
  maxTokens = 256,
  temperature = 0.3,
  conversationalEngineUrl,
  timeoutMs = 3500,
}) {
  const payload = {
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: true,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let upstreamRes = null;
  try {
    upstreamRes = await fetch(conversationalEngineUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!upstreamRes.ok || !upstreamRes.body) {
      return { success: false, accumulatedTotal: '' };
    }
  } catch {
    clearTimeout(timer);
    return { success: false, accumulatedTotal: '' };
  }

  try {
    const reader = upstreamRes.body.getReader();
    const accumulatedTotal = await processSseStream(reader, res, STOP_SEQUENCES);
    return { success: true, accumulatedTotal };
  } catch {
    return { success: false, accumulatedTotal: '' };
  }
}

