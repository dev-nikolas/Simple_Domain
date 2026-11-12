import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PORT,
  RELIC_ENGINE_URL,
  CONVERSATIONAL_SERVER_URL,
  CONVERSATIONAL_ENGINE_URL,
} from '../config.mjs';

test('Configuraciones de inferencia dual (RELIC y Conversacional SLM)', () => {
  assert.equal(typeof PORT, 'number');
  assert.ok(RELIC_ENGINE_URL.includes('/v1/chat/completions'));
  assert.equal(CONVERSATIONAL_SERVER_URL, 'http://127.0.0.1:8081');
  assert.equal(CONVERSATIONAL_ENGINE_URL, 'http://127.0.0.1:8081/v1/chat/completions');
});

