import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handleChatCompletion } from '../controllers/chatController.mjs';

function createMockReqRes(payload) {
  const req = {
    on(event, cb) {
      if (event === 'data') cb(JSON.stringify(payload));
      if (event === 'end') cb();
    }
  };

  const chunks = [];
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    writeHead(code, hdrs) { this.statusCode = code; },
    write(chunk) { chunks.push(chunk); },
    end() {}
  };

  return { req, res, chunks };
}

test('Integración Híbrida - Saludo trivial interceptado de inmediato en Capa 1', async () => {
  const { req, res, chunks } = createMockReqRes({
    messages: [{ role: 'user', content: 'hola que tal' }]
  });

  const dummyMemory = { getSystemPromptMemoryContext: () => '' };
  handleChatCompletion({
    req,
    res,
    relicMemoryStore: dummyMemory,
    relicEngineUrl: 'http://127.0.0.1:8080/v1/chat/completions',
    conversationalEngineUrl: 'http://127.0.0.1:8081/v1/chat/completions'
  });

  // El saludo se resuelve sincrónicamente en Capa 1
  const output = chunks.join('');
  assert.ok(output.includes('¡Hola! Soy RELIC'));
  assert.ok(output.includes('[DONE]'));
});

test('Integración Híbrida - Consulta conversacional cae en contingencia autónoma si 8081 está apagado', async () => {
  const { req, res, chunks } = createMockReqRes({
    messages: [{ role: 'user', content: 'explícame qué es un mutex' }]
  });

  const dummyMemory = { getSystemPromptMemoryContext: () => '', getAll: () => [] };
  handleChatCompletion({
    req,
    res,
    relicMemoryStore: dummyMemory,
    relicEngineUrl: 'http://127.0.0.1:59998/v1/chat/completions',
    conversationalEngineUrl: 'http://127.0.0.1:59999/v1/chat/completions'
  });

  // Esperar resolución del fallback
  await new Promise((r) => setTimeout(r, 600));

  const output = chunks.join('');
  assert.ok(output.includes('data: '));
  assert.ok(output.includes('[DONE]'));
  // Debe contener respuesta de contingencia generada sin pasar por el modelo nano
  assert.ok(output.includes('RELIC'));
});

test('Integración Híbrida - Consulta formal RIR se formatea en JSON acotado de Capa 2', async () => {
  const mockServer = http.createServer((sReq, sRes) => {
    sReq.resume();
    sReq.on('end', () => {
      sRes.writeHead(200, { 'Content-Type': 'application/json' });
      sRes.end(JSON.stringify({
        choices: [{ message: { content: '{"action": "graph_dependency", "slots": {"from": "Alpha", "to": "Beta"}}' } }]
      }));
    });
  });

  await new Promise((r) => mockServer.listen(0, '127.0.0.1', r));
  const port = mockServer.address().port;
  const mockRirUrl = `http://127.0.0.1:${port}/v1/chat/completions`;

  try {
    const { req, res, chunks } = createMockReqRes({
      cartridge: 'rir',
      messages: [{ role: 'user', content: 'analizar dependencia entre nodo Alpha y nodo Beta' }]
    });

    const dummyMemory = { getSystemPromptMemoryContext: () => '', getAll: () => [] };
    handleChatCompletion({
      req,
      res,
      relicMemoryStore: dummyMemory,
      relicEngineUrl: mockRirUrl,
      conversationalEngineUrl: 'http://127.0.0.1:59999/v1/chat/completions'
    });

    await new Promise((r) => setTimeout(r, 100));

    const output = chunks.join('');
    assert.ok(output.includes('```json'));
    assert.ok(output.includes('graph_dependency'));
    assert.ok(output.includes('Alpha'));
    assert.ok(output.includes('[DONE]'));
  } finally {
    mockServer.close();
  }
});
