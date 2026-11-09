import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../routes/router.mjs';
import { SessionModel } from '../models/SessionModel.mjs';
import { MemoryModel } from '../models/MemoryModel.mjs';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, val) { this.headers[key.toLowerCase()] = val; },
    writeHead(code, hdrs) {
      this.statusCode = code;
      if (hdrs) Object.entries(hdrs).forEach(([k, v]) => this.headers[k.toLowerCase()] = v);
    },
    end(chunk) { this.body = chunk ? String(chunk) : ''; }
  };
}

function setupRouter() {
  const sessionStore = new SessionModel('./data/test_router_sessions.json', 'Prompt base');
  const relicMemoryStore = new MemoryModel('./data/test_router_memory.json');
  const mcpClient = { isAvailable: () => false, getTools: () => [] };
  const allTools = [{ function: { name: 'test_tool' } }];
  const executeTool = async (name) => ({ content: [{ type: 'text', text: `Ejecutado ${name}` }], isError: false });

  const router = createRouter({
    sessionStore,
    relicMemoryStore,
    slotPersistence: null,
    mcpClient,
    allTools,
    executeTool,
    quarantineDir: './quarantine',
    defaultSystemPrompt: 'Prompt base',
    relicEngineUrl: 'http://localhost:8080'
  });

  return { router, sessionStore, relicMemoryStore };
}

test('Router - maneja preflight CORS OPTIONS y headers de seguridad', async () => {
  const { router } = setupRouter();
  const req = { method: 'OPTIONS', url: '/v1/sessions', headers: {} };
  const res = createMockResponse();

  await router(req, res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['access-control-allow-origin'], '*');
});

test('Router - GET /health devuelve telemetría y conteos correctos', async () => {
  const { router, sessionStore, relicMemoryStore } = setupRouter();
  sessionStore.create({ title: 'Sesión Diagnóstica' });
  await relicMemoryStore.add('Test', 'Conclusión diagnóstica');

  const req = { method: 'GET', url: '/health', headers: {} };
  const res = createMockResponse();

  await router(req, res);
  assert.equal(res.statusCode, 200);

  const data = JSON.parse(res.body);
  assert.equal(data.status, 'ok');
  assert.equal(data.sessionsCount, 1);
  assert.equal(data.memoriesCount, 1);
});

test('Router - CRUD de sesiones (/v1/sessions)', async () => {
  const { router, sessionStore } = setupRouter();
  const created = sessionStore.create({ title: 'Sesión Primaria' });

  // 1. GET lista
  const reqList = { method: 'GET', url: '/v1/sessions', headers: {} };
  const resList = createMockResponse();
  await router(reqList, resList);
  assert.equal(resList.statusCode, 200);
  const list = JSON.parse(resList.body);
  assert.ok(list.some(s => s.id === created.id));

  // 2. GET individual
  const reqGet = { method: 'GET', url: `/v1/sessions/${created.id}`, headers: {} };
  const resGet = createMockResponse();
  await router(reqGet, resGet);
  assert.equal(resGet.statusCode, 200);
  const session = JSON.parse(resGet.body);
  assert.equal(session.id, created.id);

  // 3. GET inexistente 404
  const req404 = { method: 'GET', url: '/v1/sessions/id_desconocido', headers: {} };
  const res404 = createMockResponse();
  await router(req404, res404);
  assert.equal(res404.statusCode, 404);
});

test('Router - ruta desconocida responde 404', async () => {
  const { router } = setupRouter();
  const req = { method: 'GET', url: '/ruta/inexistente', headers: {} };
  const res = createMockResponse();

  await router(req, res);
  assert.equal(res.statusCode, 404);
  const err = JSON.parse(res.body);
  assert.ok(err.error.toLowerCase().includes('no encontrado'));
});
