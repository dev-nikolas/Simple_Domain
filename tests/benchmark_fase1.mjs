/**
 * Simple Domain — Benchmark Riguroso Fase 1 (3 Repeticiones con Mediana y Calentamiento)
 * Mide:
 * 1. Warmup previo
 * 2. ~100 tokens Directo (3 repeticiones)
 * 3. ~100 tokens Vía Gateway optimizado (sin inyección ciega de tools) (3 repeticiones)
 * 4. ~1000 tokens Directo (3 repeticiones)
 * 5. ~3000 tokens Directo (3 repeticiones) - Validación de n_ctx=8192
 * 6. Turno 2 de conversación (Prefix cache reuse)
 */

import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';

const GATEWAY_URL = 'http://127.0.0.1:4000/v1/chat/completions';
const DIRECT_LLM_URL = 'http://127.0.0.1:8081/v1/chat/completions';

function getDockerStats() {
  try {
    return execSync('docker stats sd_llm_engine --no-stream --format "{{.CPUPerc}} | {{.MemUsage}}"', {
      encoding: 'utf-8',
    }).trim();
  } catch {
    return 'N/A';
  }
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function generatePrompt(approxTokens) {
  const baseSnippet = `// Rust concurrent LRU cache block with atomic reference count
pub struct CacheEntry<K: Eq + std::hash::Hash, V: Clone> {
    key: K,
    val: V,
    access_count: std::sync::atomic::AtomicUsize,
}
`;
  const repeats = Math.max(1, Math.floor((approxTokens * 4) / baseSnippet.length));
  let text = baseSnippet.repeat(repeats);
  const targetChars = approxTokens * 4;
  if (text.length > targetChars) text = text.substring(0, targetChars);
  return `${text}\n\nEscribe una función en Rust para calcular estadísticas de acceso sobre este LRU.`;
}

async function singleRequest(messages, maxTokens, targetUrl) {
  const body = {
    model: 'dolphin-3b',
    messages,
    temperature: 0.1,
    max_tokens: maxTokens,
    stream: true,
  };

  const tStart = performance.now();
  let tFirstToken = null;
  let tokenCount = 0;
  let fullText = '';
  let errorMsg = null;
  let peakStats = '';

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') continue;

        try {
          const json = JSON.parse(dataStr);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            if (tFirstToken === null) {
              tFirstToken = performance.now();
              peakStats = getDockerStats();
            }
            tokenCount++;
            fullText += delta;
          }
        } catch {}
      }
    }
  } catch (err) {
    errorMsg = err.message;
  }

  const tEnd = performance.now();
  const ttftMs = tFirstToken ? tFirstToken - tStart : null;
  const decodeDurationSec = tFirstToken ? (tEnd - tFirstToken) / 1000 : null;
  const decodeTokensPerSec = decodeDurationSec && tokenCount > 0 ? tokenCount / decodeDurationSec : 0;
  const totalDurationSec = (tEnd - tStart) / 1000;

  return {
    tokenCount,
    ttftMs,
    decodeTokensPerSec,
    totalDurationSec,
    peakStats: peakStats || getDockerStats(),
    errorMsg,
    fullText,
  };
}

async function runScenario(name, approxPromptTokens, maxTokens, targetUrl, repetitions = 3, customMessages = null) {
  console.log(`\n======================================================`);
  console.log(`Escenario: ${name} (${repetitions} repeticiones)`);
  console.log(`URL: ${targetUrl} | max_tokens: ${maxTokens}`);

  const ttftList = [];
  const tpsList = [];
  const totalSecList = [];
  let lastStats = '';
  let lastTokens = 0;
  let error = null;

  for (let rep = 1; rep <= repetitions; rep++) {
    const prompt = customMessages ? null : generatePrompt(approxPromptTokens);
    const messages = customMessages || [
      { role: 'system', content: 'Eres un asistente programador en Rust de alto rendimiento.' },
      { role: 'user', content: prompt },
    ];

    process.stdout.write(`  Repetición ${rep}/${repetitions}... `);
    const result = await singleRequest(messages, maxTokens, targetUrl);

    if (result.errorMsg) {
      console.log(`FALLÓ: ${result.errorMsg}`);
      error = result.errorMsg;
      break;
    }

    console.log(`OK (TTFT: ${Math.round(result.ttftMs)}ms, Decode: ${result.decodeTokensPerSec.toFixed(2)} t/s, ${result.tokenCount} tok en ${result.totalDurationSec.toFixed(1)}s)`);
    ttftList.push(result.ttftMs);
    tpsList.push(result.decodeTokensPerSec);
    totalSecList.push(result.totalDurationSec);
    lastStats = result.peakStats;
    lastTokens = result.tokenCount;
  }

  return {
    scenario: name,
    promptTokens: approxPromptTokens,
    genTokens: lastTokens,
    medianTtftMs: ttftList.length > 0 ? Math.round(median(ttftList)) : 'N/A',
    medianDecodeTps: tpsList.length > 0 ? Number(median(tpsList).toFixed(2)) : 0,
    medianTotalSec: totalSecList.length > 0 ? Number(median(totalSecList).toFixed(2)) : 0,
    peakStats: lastStats,
    error,
  };
}

async function main() {
  console.log('--- INICIO BENCHMARK FASE 1 (Con Warmup y 3 Repeticiones / Mediana) ---');

  // 0. Warmup (calentamiento)
  console.log('\n[CALENTAMIENTO] Ejecutando prompt corto para precargar memoria y caches...');
  await singleRequest(
    [{ role: 'user', content: 'Responde solo "OK".' }],
    5,
    DIRECT_LLM_URL
  );
  console.log('[CALENTAMIENTO] Completado.');

  const results = [];

  // Escenario 1: ~100 tokens Directo al motor (:8081)
  results.push(await runScenario('1. ~100 tok Directo (:8081)', 100, 100, DIRECT_LLM_URL, 3));

  // Escenario 2: ~100 tokens Vía Gateway (:4000) - Verifica fix de no inyectar tools
  results.push(await runScenario('2. ~100 tok Vía Gateway (:4000)', 100, 100, GATEWAY_URL, 3));

  // Escenario 3: ~1000 tokens Directo (:8081)
  results.push(await runScenario('3. ~1000 tok Directo (:8081)', 1000, 100, DIRECT_LLM_URL, 3));

  // Escenario 4: ~3000 tokens Directo (:8081) - Prueba de fuego de n_ctx=8192
  results.push(await runScenario('4. ~3000 tok Directo (:8081)', 3000, 100, DIRECT_LLM_URL, 3));

  // Escenario 5: Turno 2 de Conversación (Prefix Cache Test)
  // Turno 1 crea un contexto de 500 tokens
  const conversationSystem = 'Eres un ingeniero senior especializado en algoritmos concurrentes.';
  const turn1User = generatePrompt(500);
  const turn1Assistant = 'Entendido. Procedo con la implementación del LRU concurrente utilizando AtomicUsize.';
  const turn2User = 'Agrega ahora un método `evict_oldest(&self)` con comentarios explicativos.';

  const multiTurnMessages = [
    { role: 'system', content: conversationSystem },
    { role: 'user', content: turn1User },
    { role: 'assistant', content: turn1Assistant },
    { role: 'user', content: turn2User },
  ];

  results.push(
    await runScenario('5. Turno 2 Conversación (Prefix Cache)', 650, 100, DIRECT_LLM_URL, 3, multiTurnMessages)
  );

  console.log('\n======================================================');
  console.log('TABLA COMPARATIVA FINAL FASE 1 (MEDIANAS):');
  console.table(
    results.map((r) => ({
      Escenario: r.scenario,
      'Prompt Aprox': r.promptTokens,
      'Gen Tokens': r.genTokens,
      'TTFT Mediana (ms)': r.medianTtftMs,
      'Decode Mediana (t/s)': r.medianDecodeTps,
      'Duración Mediana (s)': r.medianTotalSec,
      'Docker CPU | RAM': r.peakStats,
      Estado: r.error ? 'FALLÓ' : 'OK',
    }))
  );
}

main().catch(console.error);

