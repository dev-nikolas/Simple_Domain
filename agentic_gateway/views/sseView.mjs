// Simple Domain — Server-Sent Events (SSE) View
// Principio de Responsabilidad Única (SRP): Serialización del protocolo de streaming SSE.

import { setCorsHeaders } from './jsonView.mjs';

export function initSSEStream(res) {
  setCorsHeaders(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

export function sendSSEDelta(res, text) {
  const chunk = {
    choices: [{ delta: { content: text }, finish_reason: null }],
  };
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}

export function sendSSEToolCall(res, toolCallPayload) {
  res.write(`data: ${JSON.stringify(toolCallPayload)}\n\n`);
}

export function sendSSEError(res, errorMessage) {
  res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
}

export function endSSEStream(res) {
  res.write('data: [DONE]\n\n');
  res.end();
}

