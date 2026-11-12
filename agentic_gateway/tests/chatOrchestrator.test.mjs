import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatOrchestratorService } from '../services/ChatOrchestratorService.mjs';
import { buildChatHandler } from '../controllers/chatController.mjs';

function createMockResponse() {
  const chunks = [];
  return {
    statusCode: 200,
    headersSent: false,
    headers: {},
    chunks,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    writeHead(code, hdrs) {
      this.statusCode = code;
      this.headersSent = true;
      if (hdrs) Object.assign(this.headers, hdrs);
    },
    write(chunk) { chunks.push(chunk); },
    end() { this.headersSent = true; },
    output() { return chunks.join(''); }
  };
}

function createMockSessionStore() {
  const history = [];
  return {
    history,
    addMessage(id, msg) { history.push({ id, ...msg }); }
  };
}

test('ChatOrchestratorService - Capa 1: Saludo instantáneo sin red ni CPU', async () => {
  const sessionStore = createMockSessionStore();
  const orchestrator = new ChatOrchestratorService(sessionStore, null);
  const res = createMockResponse();

  await orchestrator.dispatch({
    res,
    payload: { prompt: 'hola que tal', sessionId: 's-123' }
  });

  const out = res.output();
  assert.ok(out.includes('¡Hola! Soy RELIC'));
  assert.ok(out.includes('[DONE]'));
  assert.equal(sessionStore.history.length, 2);
  assert.equal(sessionStore.history[0].role, 'user');
  assert.equal(sessionStore.history[1].role, 'assistant');
});

test('ChatOrchestratorService - Capa 3: Fallback autónomo si 8081 está apagado', async () => {
  const sessionStore = createMockSessionStore();
  const orchestrator = new ChatOrchestratorService(sessionStore, null);
  const res = createMockResponse();

  await orchestrator.dispatch({
    res,
    payload: { prompt: 'explícame el algoritmo de consensus paxos', sessionId: 's-456' },
    conversationalEngineUrl: 'http://127.0.0.1:59997/v1/chat/completions'
  });

  const out = res.output();
  assert.ok(out.includes('data: '));
  assert.ok(out.includes('[DONE]'));
  assert.ok(out.includes('RELIC'));
  assert.equal(sessionStore.history.length, 2);
});

test('ChatOrchestratorService - Capa 2: Extracción estricta de slots RIR en JSON', async () => {
  const sessionStore = createMockSessionStore();
  const orchestrator = new ChatOrchestratorService(sessionStore, null);
  const res = createMockResponse();

  await orchestrator.dispatch({
    res,
    payload: {
      cartridge: 'rir',
      prompt: 'evaluar slots origen Madrid destino Valencia',
      sessionId: 's-789'
    },
    relicEngineUrl: 'http://127.0.0.1:59996/v1/chat/completions'
  });

  const out = res.output();
  assert.ok(out.includes('```json'));
  assert.ok(out.includes('[DONE]'));
  assert.equal(sessionStore.history.length, 2);
});

test('buildChatHandler - fabrica un adaptador HTTP funcional con inyección de dependencias', async () => {
  const sessionStore = createMockSessionStore();
  const handler = buildChatHandler(sessionStore, null);
  assert.equal(typeof handler, 'function');

  const req = {
    on(event, cb) {
      if (event === 'data') cb(JSON.stringify({ prompt: 'buenos días' }));
      if (event === 'end') cb();
    }
  };
  const res = createMockResponse();

  await handler(req, res);
  assert.ok(res.output().includes('¡Hola! Soy RELIC'));
});

