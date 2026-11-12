import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQueryIntent, INTENT } from '../controllers/cognitiveRouter.mjs';

test('CognitiveRouter - detecta saludos triviales (GREETING)', () => {
  assert.equal(classifyQueryIntent('hola'), INTENT.GREETING);
  assert.equal(classifyQueryIntent('Buenos días!'), INTENT.GREETING);
  assert.equal(classifyQueryIntent('hey, que tal?'), INTENT.GREETING);
});

test('CognitiveRouter - detecta extracción formal / RIR (RIR_SLOTS)', () => {
  assert.equal(classifyQueryIntent('extraer slots de la variable X', 'rir'), INTENT.RIR_SLOTS);
  assert.equal(classifyQueryIntent('rir: analizar dependencia nodo A -> B'), INTENT.RIR_SLOTS);
  assert.equal(classifyQueryIntent('evaluar slots algebra: x + y = 10'), INTENT.RIR_SLOTS);
});

test('CognitiveRouter - clasifica preguntas conceptuales o diálogo libre como CONVERSATIONAL', () => {
  assert.equal(classifyQueryIntent('¿Cómo funciona el borrow checker en Rust?'), INTENT.CONVERSATIONAL);
  assert.equal(classifyQueryIntent('Explícame la diferencia entre un mutex y un semáforo'), INTENT.CONVERSATIONAL);
  assert.equal(classifyQueryIntent('Escribe un script en python para leer un CSV'), INTENT.CONVERSATIONAL);
});

