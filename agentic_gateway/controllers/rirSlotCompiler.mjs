// Simple Domain — Compilador Semántico de Slots RIR (Capa 2)
// Responsabilidad Única: Aislamiento del modelo nano H1 (10M-25M).
// Purgado absoluto de instrucciones CoT en lenguaje natural y acotamiento a JSON estricto.

const FEW_SHOT_TEMPLATE = `Eres un compilador de variables y slots semánticos.
Tu salida debe ser ÚNICAMENTE un objeto JSON que identifique la acción y los slots.
No agregues comentarios, explicaciones, ni etiquetas de pensamiento.

Ejemplos:
Consulta: rir: dependencia entre alpha y beta
Salida: {"action": "graph_dependency", "slots": {"from": "alpha", "to": "beta"}}

Consulta: calcular suma 15 + 30
Salida: {"action": "arithmetic", "slots": {"op": "add", "a": 15, "b": 30}}

Consulta: {USER_PROMPT}
Salida:`;

/**
 * Construye un prompt estricto purgado de cualquier CoT para el modelo nano.
 * @param {string} userPrompt
 * @returns {string}
 */
export function buildRirSlotPrompt(userPrompt) {
  const cleanPrompt = (userPrompt || '')
    .replace(/\[OBSERVACI[ÓO]N\]:?/gi, '')
    .replace(/\[INFERENCIA\]:?/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  return FEW_SHOT_TEMPLATE.replace('{USER_PROMPT}', cleanPrompt);
}

/**
 * Parámetros hiper-restringidos para evitar saturación de CPU y bucles en el modelo nano.
 */
export function getRirInferenceParams() {
  return {
    temperature: 0.0,
    max_tokens: 32,
    repetition_penalty: 1.05,
    stop: ["\n", "}", "<|box_end|>", "<|im_end|>", "<|endoftext|>"],
  };
}

/**
 * Extrae y valida la estructura JSON de la salida del modelo.
 * @param {string} modelOutput
 * @returns {{ action: string, slots: Record<string, any> }}
 */
export function extractRirJson(modelOutput) {
  if (!modelOutput || typeof modelOutput !== 'string') {
    return { action: 'unknown', slots: {} };
  }

  try {
    const firstBrace = modelOutput.indexOf('{');
    const lastBrace = modelOutput.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = modelOutput.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        return {
          action: parsed.action || 'unknown',
          slots: parsed.slots || {},
        };
      }
    }
  } catch {
    // Salida no conforme
  }

  return { action: 'unknown', slots: {} };
}
