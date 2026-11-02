/**
 * Simple Domain — Script Reproducible de Benchmark (Línea Base)
 * Mide TTFT, velocidad de decode (tokens/s), velocidad de prefill, latencia end-to-end,
 * y uso de recursos del contenedor sd_llm_engine.
 */

import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';

const GATEWAY_URL = 'http://127.0.0.1:4000/v1/chat/completions';
const DIRECT_LLM_URL = 'http://127.0.0.1:8081/v1/chat/completions';

function getDockerStats() {
  try {
    const out = execSync('docker stats sd_llm_engine --no-stream --format "{{.CPUPerc}} | {{.MemUsage}}"', {
      encoding: 'utf-8',
    }).trim();
    return out;
  } catch {
    return 'N/A';
  }
}

// Generador de texto para simular tamaño exacto aproximado de tokens
function generatePrompt(approxTokens) {
  // En inglés/código, 1 token ≈ 0.75 palabras (~4 caracteres por token)
  const baseSnippet = `// Rust memory management and concurrent state verification routine
pub struct StateManager<T: Send + Sync> {
    inner: std::sync::Arc<std::sync::RwLock<T>>,
    counter: std::sync::atomic::AtomicU64,
}
impl<T: Send + Sync> StateManager<T> {
    pub fn new(val: T) -> Self {
        Self {
            inner: std::sync::Arc::new(std::sync::RwLock::new(val)),
            counter: std::sync::atomic::AtomicU64::new(0),
        }
    }
}
`;
  const repeats = Math.max(1, Math.floor((approxTokens * 4) / baseSnippet.length));
  let text = baseSnippet.repeat(repeats);

  // Recortar a longitud aproximada
  const targetChars = approxTokens * 4;
  if (text.length > targetChars) {
    text = text.substring(0, targetChars);
  }

  return `${text}\n\nPor favor implementa una función en Rust de alto rendimiento con pruebas completas y comentarios explicativos para optimizar este gestor.`;
}

async function runBenchmark(label, promptTokens, maxTokens, targetUrl) {
  console.log(`\n======================================================`);
  console.log(`Ejecutando: ${label} (~${promptTokens} tokens de prompt, max_tokens=${maxTokens})`);
  console.log(`URL destino: ${targetUrl}`);
  console.log(`Docker stats inicial: ${getDockerStats()}`);

  const prompt = generatePrompt(promptTokens);

  const body = {
    model: 'dolphin-3b',
    messages: [
      { role: 'system', content: 'Eres un ingeniero de sistemas experto en Rust de alto rendimiento.' },
      { role: 'user', content: prompt },
    ],
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
        } catch {
          // Ignorar lineas intermedias
        }
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

  // Consultar logs del contenedor para obtener métricas exactas del motor (prompt eval y eval)
  let enginePrefillTps = 'N/A';
  let engineDecodeTps = 'N/A';
  try {
    const logs = execSync('docker logs --tail 15 sd_llm_engine', { encoding: 'utf-8' });
    const promptEvalMatch = logs.match(/prompt eval time =\s*([\d.]+)\s*ms\s*\/\s*(\d+)\s*tokens\s*\(\s*[\d.]+\s*ms per token,\s*([\d.]+)\s*tokens per second\)/);
    if (promptEvalMatch) {
      enginePrefillTps = `${promptEvalMatch[3]} t/s (${promptEvalMatch[2]} tok in ${promptEvalMatch[1]}ms)`;
    }
    const evalMatch = logs.match(/eval time =\s*([\d.]+)\s*ms\s*\/\s*(\d+)\s*tokens\s*\(\s*[\d.]+\s*ms per token,\s*([\d.]+)\s*tokens per second\)/);
    if (evalMatch) {
      engineDecodeTps = `${evalMatch[3]} t/s (${evalMatch[2]} tok in ${evalMatch[1]}ms)`;
    }
  } catch {}

  console.log(`Resultado: ${errorMsg ? `ERROR: ${errorMsg}` : 'OK'}`);
  console.log(`Tokens generados: ${tokenCount}`);
  console.log(`TTFT (Tiempo al primer token): ${ttftMs ? `${ttftMs.toFixed(1)} ms` : 'N/A'}`);
  console.log(`Tiempo total: ${totalDurationSec.toFixed(2)} s`);
  console.log(`Velocidad de Decode (cliente): ${decodeTokensPerSec.toFixed(2)} tokens/s`);
  console.log(`Métricas internas de llama.cpp:`);
  console.log(`  - Prefill: ${enginePrefillTps}`);
  console.log(`  - Decode: ${engineDecodeTps}`);
  console.log(`Docker stats durante la inferencia: ${peakStats || getDockerStats()}`);

  return {
    label,
    promptTokens,
    maxTokens,
    generatedTokens: tokenCount,
    ttftMs: ttftMs ? Math.round(ttftMs) : 'ERROR',
    totalSec: Number(totalDurationSec.toFixed(2)),
    decodeTps: Number(decodeTokensPerSec.toFixed(2)),
    enginePrefillTps,
    engineDecodeTps,
    dockerPeakStats: peakStats || getDockerStats(),
    error: errorMsg,
  };
}

async function main() {
  console.log('Iniciando batería de pruebas de Línea Base (Fase 0)...');

  const results = [];

  // Test 1: Prompt ~100 tokens, generación ~150 tokens
  results.push(await runBenchmark('Baseline ~100 tok (Direct LLM)', 100, 150, DIRECT_LLM_URL));

  // Test 2: Prompt ~100 tokens vía Gateway (para comparar overhead del Gateway SSE)
  results.push(await runBenchmark('Baseline ~100 tok (Via Gateway :4000)', 100, 150, GATEWAY_URL));

  // Test 3: Prompt ~1000 tokens, generación ~200 tokens
  results.push(await runBenchmark('Baseline ~1000 tok (Direct LLM)', 1000, 200, DIRECT_LLM_URL));

  // Test 4: Prompt ~4000 tokens (diagnóstico del límite de contexto de 2048)
  results.push(await runBenchmark('Baseline ~4000 tok (Diagnóstico Límite Contexto)', 4000, 200, DIRECT_LLM_URL));

  console.log('\n======================================================');
  console.log('RESUMEN DE LÍNEA BASE TABULADO:');
  console.table(
    results.map((r) => ({
      Prueba: r.label,
      'Prompt Tok': r.promptTokens,
      'Gen Tok': r.generatedTokens,
      'TTFT (ms)': r.ttftMs,
      'Decode Tok/s': r.decodeTps,
      'Total (s)': r.totalSec,
      'Prefill Motor': r.enginePrefillTps,
      'Stats Docker (CPU|RAM)': r.dockerPeakStats,
      Estado: r.error ? 'FALLÓ' : 'OK',
    }))
  );
}

main().catch(console.error);

