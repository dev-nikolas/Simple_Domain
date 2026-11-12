// Simple Domain — Enrutador Cognitivo Heurístico (Capa 1)
// Responsabilidad Única: Clasificar la intención de la consulta de forma instantánea (< 1ms)
// sin despertar inferencias innecesarias ni consumir ciclos de CPU.

export const INTENT = Object.freeze({
  GREETING: 'GREETING',
  RIR_SLOTS: 'RIR_SLOTS',
  CONVERSATIONAL: 'CONVERSATIONAL',
});

const GREETING_REGEX = /^(hola|buenos\s*d[ií]as|buenas\s*tardes|buenas\s*noches|hey|saludos|qu[eé]\s*tal|c[oó]mo\s*est[aá]s)[\s,!?.¡¿]*$/i;
const GREETING_PREFIX_REGEX = /^(hola|buenos\s*d[ií]as|buenas\s*tardes|buenas\s*noches|hey)[\s,!?.¡¿]+(qu[eé]\s*tal|c[oó]mo\s*est[aá]s)[\s,!?.¡¿]*$/i;

const RIR_TRIGGER_REGEX = /^(rir\s*:|extraer\s+slots|evaluar\s+slots|slots\s+algebra|extraer\s+variables)/i;

/**
 * Clasifica la intención del usuario entre:
 * - GREETING: Saludos triviales (resueltos en Capa 1 de inmediato).
 * - RIR_SLOTS: Extracción formal de variables/slots para el microkernel o modelo nano H1 (Capa 2).
 * - CONVERSATIONAL: Diálogo abierto, explicaciones conceptuales y programación (Capa 3).
 *
 * @param {string} prompt
 * @param {string} [cartridge]
 * @returns {'GREETING' | 'RIR_SLOTS' | 'CONVERSATIONAL'}
 */
export function classifyQueryIntent(prompt, cartridge = '') {
  if (!prompt || typeof prompt !== 'string') {
    return INTENT.CONVERSATIONAL;
  }

  const clean = prompt.trim();

  // 1. Detección de saludos
  if (GREETING_REGEX.test(clean) || GREETING_PREFIX_REGEX.test(clean)) {
    return INTENT.GREETING;
  }

  // 2. Detección de extracción de slots / RIR
  const c = (cartridge || '').toLowerCase();
  if (c === 'rir' || c === 'slots' || RIR_TRIGGER_REGEX.test(clean)) {
    return INTENT.RIR_SLOTS;
  }

  // 3. Consulta general conversacional / técnica
  return INTENT.CONVERSATIONAL;
}

