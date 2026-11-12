import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SessionModel } from '../models/SessionModel.mjs';

const TEST_FILE = path.join(process.cwd(), 'data', 'test_sessions_unit.json');

async function cleanup(model) {
  if (model) model.close();
  try { await fs.rm(TEST_FILE, { force: true }); } catch (err) { void err; }
}

test('SessionModel - inicialización crea sesión por defecto si almacén está vacío', async () => {
  await cleanup();
  const model = new SessionModel(TEST_FILE, 'Eres un asistente técnico.');
  await model.init();

  const sessions = model.list();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].title, 'Nueva Conversación');
  await cleanup(model);
});

test('SessionModel - ciclo completo de creación, consulta y paginación de mensajes', async () => {
  await cleanup();
  const model = new SessionModel(TEST_FILE, 'Sistema base.');
  const session = model.create({ title: 'Análisis de Red' });
  assert.ok(session.id);
  assert.equal(session.title, 'Análisis de Red');

  // Adición de mensajes
  model.addMessage(session.id, { role: 'user', content: '¿Qué puertos están abiertos?' });
  model.addMessage(session.id, { role: 'assistant', content: 'Escaneando puertos locales...' });

  const fetched = model.get(session.id);
  assert.equal(fetched.messages.length, 3); // 1 system + 2 agregados

  // Paginación con limit y offset
  const paged = model.get(session.id, 1, 1);
  assert.equal(paged.messages.length, 1);
  assert.equal(paged.messages[0].role, 'user');

  await cleanup(model);
});

test('SessionModel - actualización de título automática y manual', async () => {
  await cleanup();
  const model = new SessionModel(TEST_FILE, 'Sistema.');
  const session = model.create(); // Título inicial: 'Nueva Conversación'

  // El primer mensaje de usuario actualiza el título automáticamente
  model.addMessage(session.id, { role: 'user', content: 'Auditoría de dependencias en Rust' });
  const updatedAuto = model.get(session.id);
  assert.equal(updatedAuto.title, 'Auditoría de dependencias en Rust');

  // Actualización manual de título
  model.updateTitle(session.id, 'Auditoría Finalizada');
  const updatedManual = model.get(session.id);
  assert.equal(updatedManual.title, 'Auditoría Finalizada');

  await cleanup(model);
});

test('SessionModel - sincronización de mensajes y eliminación de sesión', async () => {
  await cleanup();
  const model = new SessionModel(TEST_FILE, 'Sistema.');
  const session = model.create({ title: 'Sesión Temporal' });

  model.syncSessionMessages(session.id, [
    { role: 'user', content: 'Mensaje sincronizado 1' },
    { role: 'assistant', content: 'Respuesta 1' }
  ]);

  let fetched = model.get(session.id);
  assert.equal(fetched.messages.length, 2);

  // Eliminación
  const deleted = model.delete(session.id);
  assert.equal(deleted, true);

  // Al vaciarse todas las sesiones, crea una por defecto
  assert.equal(model.list().length, 1);
  await cleanup(model);
});
