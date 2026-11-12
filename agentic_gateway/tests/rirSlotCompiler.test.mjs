import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRirSlotPrompt,
  extractRirJson,
  getRirInferenceParams,
} from '../controllers/rirSlotCompiler.mjs';

test('RirSlotCompiler - buildRirSlotPrompt purga CoT y genera plantilla JSON estricta', () => {
  const prompt = buildRirSlotPrompt('analizar dependencia nodo A -> B');

  // No debe contener plantillas CoT residuales ni etiquetas think
  assert.ok(!prompt.includes('[OBSERVACIÓN]'));
  assert.ok(!prompt.includes('[INFERENCIA]'));
  assert.ok(!prompt.includes('<think>'));

  // Debe contener la especificación de formato JSON
  assert.ok(prompt.includes('{"action":'));
  assert.ok(prompt.includes('"slots":'));
  assert.ok(prompt.includes('nodo A -> B'));
});

test('RirSlotCompiler - getRirInferenceParams fuerza parámetros acotados y seguros', () => {
  const params = getRirInferenceParams();
  assert.equal(params.temperature, 0.0);
  assert.ok(params.max_tokens <= 32);
  assert.ok(params.stop.includes('}'));
  assert.ok(params.stop.includes('<|box_end|>'));
});

test('RirSlotCompiler - extractRirJson parsea JSON válido o fallback estructurado', () => {
  const rawOutput = '```json\n{"action": "analyze_graph", "slots": {"from": "A", "to": "B"}}\n```';
  const parsed = extractRirJson(rawOutput);
  assert.equal(parsed.action, 'analyze_graph');
  assert.equal(parsed.slots.from, 'A');
  assert.equal(parsed.slots.to, 'B');

  // Fallback seguro ante salida corrupta
  const corruptOutput = 'incoherencia total <|box_end|>';
  const fallback = extractRirJson(corruptOutput);
  assert.equal(fallback.action, 'unknown');
  assert.deepEqual(fallback.slots, {});
});

