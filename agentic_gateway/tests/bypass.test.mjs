import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFastConversationalBypass } from '../controllers/chatController.mjs';

test('checkFastConversationalBypass detecta saludos cotidianos y responde al instante', () => {
  const g1 = checkFastConversationalBypass('hola');
  assert.ok(g1 && g1.includes('¡Hola! Soy RELIC'));

  const g2 = checkFastConversationalBypass('Hola!');
  assert.ok(g2 && g2.includes('¡Hola! Soy RELIC'));

  const g3 = checkFastConversationalBypass('Buenos días');
  assert.ok(g3 && g3.includes('¡Hola! Soy RELIC'));

  const g4 = checkFastConversationalBypass('¿Qué puertos están en escucha?');
  assert.equal(g4, null);
});

