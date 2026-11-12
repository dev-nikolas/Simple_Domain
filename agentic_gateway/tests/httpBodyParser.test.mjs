import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonBody } from '../utils/httpBodyParser.mjs';

function createMockReq(chunks, shouldError = false) {
  let destroyed = false;
  return {
    destroy() { destroyed = true; },
    isDestroyed() { return destroyed; },
    on(event, cb) {
      if (event === 'data' && !shouldError) {
        for (const chunk of chunks) cb(chunk);
      }
      if (event === 'end' && !shouldError) {
        cb();
      }
      if (event === 'error' && shouldError) {
        cb(new Error('Socket reset'));
      }
    }
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    writeHead(code, hdrs) {
      this.statusCode = code;
      if (hdrs) Object.entries(hdrs).forEach(([k, v]) => this.headers[k.toLowerCase()] = v);
    },
    end(chunk) { this.body = chunk ? String(chunk) : ''; }
  };
}

test('httpBodyParser - parsea JSON válido correctamente', async () => {
  const req = createMockReq(['{"hello":', '"world"}']);
  const res = createMockRes();

  const payload = await parseJsonBody(req, res);
  assert.deepEqual(payload, { hello: 'world' });
  assert.equal(res.statusCode, 200);
});

test('httpBodyParser - maneja cuerpo vacío retornando {}', async () => {
  const req = createMockReq(['   ']);
  const res = createMockRes();

  const payload = await parseJsonBody(req, res);
  assert.deepEqual(payload, {});
});

test('httpBodyParser - rechaza JSON malformado con HTTP 400', async () => {
  const req = createMockReq(['{invalid_json']);
  const res = createMockRes();

  const payload = await parseJsonBody(req, res);
  assert.equal(payload, null);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.includes('JSON malformado'));
});

test('httpBodyParser - rechaza payload que excede el límite con HTTP 413', async () => {
  const largeChunk = 'x'.repeat(100);
  const req = createMockReq([largeChunk]);
  const res = createMockRes();

  const payload = await parseJsonBody(req, res, 50);
  assert.equal(payload, null);
  assert.equal(res.statusCode, 413);
  assert.ok(res.body.includes('Payload demasiado grande'));
  assert.equal(req.isDestroyed(), true);
});

