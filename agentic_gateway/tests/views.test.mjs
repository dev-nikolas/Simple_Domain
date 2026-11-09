import test from 'node:test';
import assert from 'node:assert/strict';
import { sendJson, sendError, sendNoContent } from '../views/jsonView.mjs';
import {
  initSSEStream,
  sendSSEDelta,
  sendSSEToolCall,
  sendSSEError,
  endSSEStream
} from '../views/sseView.mjs';
import { renderHealth } from '../views/healthView.mjs';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    chunks: [],
    setHeader(key, val) { this.headers[key.toLowerCase()] = val; },
    writeHead(code, hdrs) {
      this.statusCode = code;
      if (hdrs) Object.entries(hdrs).forEach(([k, v]) => this.headers[k.toLowerCase()] = v);
    },
    write(chunk) { this.chunks.push(String(chunk)); },
    end(chunk) {
      if (chunk) this.chunks.push(String(chunk));
      this.finished = true;
    },
    flushHeaders() { this.flushed = true; }
  };
}

test('jsonView - envía payload JSON y códigos de estado adecuados', () => {
  const res = createMockResponse();
  sendJson(res, 201, { success: true, id: 42 });

  assert.equal(res.statusCode, 201);
  assert.equal(res.headers['content-type'], 'application/json');
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.deepEqual(JSON.parse(res.chunks[0]), { success: true, id: 42 });
});

test('jsonView - sendError formatea objeto de error', () => {
  const res = createMockResponse();
  sendError(res, 400, 'Parámetro faltante');

  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.chunks[0]), { error: 'Parámetro faltante' });
});

test('jsonView - sendNoContent finaliza con 204', () => {
  const res = createMockResponse();
  sendNoContent(res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.chunks.length, 0);
  assert.equal(res.finished, true);
});

test('sseView - flujo completo de eventos SSE con chunks formateados', () => {
  const res = createMockResponse();

  initSSEStream(res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'text/event-stream');
  assert.equal(res.headers['cache-control'], 'no-cache, no-transform');

  sendSSEDelta(res, 'Hola ');
  sendSSEDelta(res, 'Mundo');
  sendSSEToolCall(res, 'read_file', { path: 'test.txt' });
  sendSSEError(res, 'Advertencia');
  endSSEStream(res);

  const fullOutput = res.chunks.join('');
  assert.ok(fullOutput.includes('Hola '));
  assert.ok(fullOutput.includes('Mundo'));
  assert.ok(fullOutput.includes('read_file'));
  assert.ok(fullOutput.includes('data: [DONE]\n\n'));
  assert.equal(res.finished, true);
});

test('healthView - serializa telemetría de salud correctamente', () => {
  const res = createMockResponse();
  renderHealth(res, {
    status: 'ok',
    uptime: 120,
    toolsCount: 5,
    sessionsCount: 3,
    memoriesCount: 2,
    mcpInitialized: true,
  });

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.chunks[0]);
  assert.equal(data.status, 'ok');
  assert.equal(data.mcp, true);
  assert.equal(data.toolsCount, 5);
});
