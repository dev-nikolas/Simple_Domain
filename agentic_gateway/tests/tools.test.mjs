import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { LOCAL_TOOLS } from '../tools/catalog.mjs';
import { executeTool } from '../tools/executors.mjs';
import { MemoryModel } from '../models/MemoryModel.mjs';

const TEST_QUARANTINE = path.join(process.cwd(), 'data', 'test_quarantine');
const TEST_MEMORY_FILE = path.join(process.cwd(), 'data', 'test_memory_tools.json');

async function cleanup() {
  try { await fs.rm(TEST_QUARANTINE, { recursive: true, force: true }); } catch (err) { void err; }
  try { await fs.rm(TEST_MEMORY_FILE, { force: true }); } catch (err) { void err; }
}

test('Catalog - validación de esquemas de herramientas declaradas', () => {
  assert.ok(Array.isArray(LOCAL_TOOLS));
  assert.ok(LOCAL_TOOLS.length >= 4);

  const toolNames = LOCAL_TOOLS.map(t => t.function.name);
  assert.ok(toolNames.includes('read_code_file'));
  assert.ok(toolNames.includes('relic_fs_modify'));
  assert.ok(toolNames.includes('relic_web_search'));
  assert.ok(toolNames.includes('relic_memorize'));
});

test('Executors - read_code_file lee archivos existentes y reporta errores', async () => {
  const result = await executeTool('read_code_file', { path: 'package.json' }, {});
  assert.equal(result.isError, false);
  assert.ok(result.content[0].text.includes('agentic-gateway'));

  const errorResult = await executeTool('read_code_file', { path: 'archivo_que_no_existe.xyz' }, {});
  assert.equal(errorResult.isError, true);
  assert.ok(errorResult.content[0].text.includes('Error leyendo archivo'));
});

test('Executors - relic_fs_modify ciclo completo (create, read, list, delete)', async () => {
  await cleanup();
  const options = { quarantineDir: TEST_QUARANTINE };

  // 1. Create file
  const createRes = await executeTool('relic_fs_modify', {
    path: 'sub/test.txt',
    action: 'create',
    content: 'Contenido de prueba'
  }, options);
  assert.equal(createRes.isError, false);

  // 2. Read file
  const readRes = await executeTool('relic_fs_modify', {
    path: 'sub/test.txt',
    action: 'read'
  }, options);
  assert.equal(readRes.isError, false);
  assert.equal(readRes.content[0].text, 'Contenido de prueba');

  // 3. List directory
  const listRes = await executeTool('relic_fs_modify', {
    path: 'sub',
    action: 'list'
  }, options);
  assert.equal(listRes.isError, false);
  assert.ok(listRes.entries.some(e => e.name === 'test.txt'));

  // 4. Delete file
  const deleteRes = await executeTool('relic_fs_modify', {
    path: 'sub/test.txt',
    action: 'delete'
  }, options);
  assert.equal(deleteRes.isError, false);

  await cleanup();
});

test('Executors - relic_memorize integra y persiste en MemoryModel', async () => {
  await cleanup();
  const relicMemoryStore = new MemoryModel(TEST_MEMORY_FILE);
  await relicMemoryStore.init();

  const res = await executeTool('relic_memorize', {
    topic: 'Optimización de Memoria',
    conclusion: 'Liberar buffers tras el procesamiento de streaming.'
  }, { relicMemoryStore });

  assert.equal(res.isError, false);
  assert.ok(res.content[0].text.includes('[MEMORIZADO]'));
  assert.equal(relicMemoryStore.getAll().length, 1);
  assert.equal(relicMemoryStore.getAll()[0].topic, 'Optimización de Memoria');

  await cleanup();
});

test('Executors - despacho de herramienta desconocida reporta error estructurado', async () => {
  const result = await executeTool('herramienta_fantasma', {}, {});
  assert.equal(result.isError, true);
  assert.ok(result.content[0].text.includes('Herramienta desconocida'));
});

