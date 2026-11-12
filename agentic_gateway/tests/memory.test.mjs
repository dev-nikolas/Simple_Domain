import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MemoryModel } from '../models/MemoryModel.mjs';

const TEST_FILE = path.join(process.cwd(), 'data', 'test_memory_unit.json');

async function cleanup() {
  try { await fs.rm(TEST_FILE, { force: true }); } catch (err) { void err; }
}

test('MemoryModel - inicialización vacía y persistencia de conclusiones', async () => {
  await cleanup();
  const model = new MemoryModel(TEST_FILE);
  await model.init();

  assert.deepEqual(model.getAll(), []);

  const entry = await model.add('Arquitectura', 'El backend utiliza MVC con controladores desacoplados.');
  assert.ok(entry.id.startsWith('mem_'));
  assert.equal(entry.topic, 'Arquitectura');
  assert.equal(entry.conclusion, 'El backend utiliza MVC con controladores desacoplados.');

  const all = model.getAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, entry.id);

  await cleanup();
});

test('MemoryModel - formato de contexto para el prompt del sistema', async () => {
  await cleanup();
  const model = new MemoryModel(TEST_FILE);
  await model.init();

  assert.equal(model.getSystemPromptMemoryContext(), '');

  await model.add('Seguridad', 'Las claves de API deben residir en variables de entorno.');
  await model.add('Rendimiento', 'Las respuestas SSE reducen la latencia percibida.');

  const context = model.getSystemPromptMemoryContext();
  assert.ok(context.includes('MEMORIA EPISÓDICA'));
  assert.ok(context.includes('Seguridad'));
  assert.ok(context.includes('Rendimiento'));

  await cleanup();
});

test('MemoryModel - eliminación de registros de memoria', async () => {
  await cleanup();
  const model = new MemoryModel(TEST_FILE);
  await model.init();

  const entry = await model.add('Cache', 'Invalidar cache en mutaciones.');
  assert.equal(model.getAll().length, 1);

  const deleted = await model.delete(entry.id);
  assert.ok(deleted);
  assert.equal(deleted.id, entry.id);
  assert.equal(model.getAll().length, 0);

  const nonExistent = await model.delete('mem_inexistente');
  assert.equal(nonExistent, null);

  await cleanup();
});
