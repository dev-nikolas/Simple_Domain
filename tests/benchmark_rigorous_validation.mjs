import http from 'http';

function measureStream(options, payload) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let ttft = null;
    let tokenCount = 0;
    let firstTokenTime = 0;
    let lastChunkTime = start;
    const interChunkLatencies = [];

    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      let buffer = '';
      res.on('data', (chunk) => {
        const now = performance.now();
        if (ttft === null) {
          ttft = Math.round(now - start);
          firstTokenTime = now;
        } else {
          interChunkLatencies.push(Math.round(now - lastChunkTime));
        }
        lastChunkTime = now;

        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) tokenCount++;
            } catch {}
          }
        }
      });

      res.on('end', () => {
        const totalDuration = (performance.now() - start) / 1000;
        const decodeDuration = (performance.now() - firstTokenTime) / 1000;
        const decodeSpeed = decodeDuration > 0 && tokenCount > 0 
          ? Number((tokenCount / decodeDuration).toFixed(2)) 
          : 0;

        interChunkLatencies.sort((a, b) => a - b);
        const p50 = interChunkLatencies.length ? interChunkLatencies[Math.floor(interChunkLatencies.length * 0.50)] : 0;
        const p95 = interChunkLatencies.length ? interChunkLatencies[Math.floor(interChunkLatencies.length * 0.95)] : 0;
        const maxJitter = interChunkLatencies.length ? interChunkLatencies[interChunkLatencies.length - 1] : 0;

        resolve({
          ttft,
          tokenCount,
          totalDuration: Number(totalDuration.toFixed(2)),
          decodeSpeed,
          interChunk: { p50, p95, maxJitter }
        });
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

function stats(arr) {
  const n = arr.length;
  if (n === 0) return { mean: 0, std: 0, median: 0, min: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1 || 1);
  const std = Math.sqrt(variance);
  const median = sorted[Math.floor(n / 2)];
  return {
    mean: Number(mean.toFixed(2)),
    std: Number(std.toFixed(2)),
    median: Number(median.toFixed(2)),
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[n - 1].toFixed(2))
  };
}

const BASE_TEXT_370 = `Diseña una arquitectura en Rust para un buffer concurrente sin bloqueos (lock-free ring buffer).
Requisitos:
1. AtomicPtr, AtomicUsize y orden Acquire-Release.
2. Prevención de ABA con contadores de época.
3. Métodos enqueue/dequeue MPMC seguros.
4. Alineación a líneas de caché L1 de 64 bytes para mitigar false sharing.
Docstrings y seguridad de memoria garantizada.`;

function getPrompt(targetTokens) {
  if (targetTokens <= 400) {
    return BASE_TEXT_370;
  }
  if (targetTokens <= 1200) {
    let text = BASE_TEXT_370 + '\n\n';
    text += `Adicionalmente, implementa los siguientes módulos de bajo nivel:\n`;
    text += `A. Gestión de memoria virtual con mmap() y madvise(MADV_HUGEPAGE).\n`;
    text += `B. Pool de descriptores de socket no bloqueantes con epoll / kqueue.\n`;
    text += `C. Serializador binario zero-copy para estructuras de telemetría de trading de baja latencia.\n`;
    text += `D. Pruebas de estrés y benchmarking con criterion::black_box y barreras de memoria completas.\n`;
    text += `Incluye manejo de fallos de página, afinidad de hilos a núcleos físicos y benchmarks de cache misses L3.\n`.repeat(3);
    return text;
  }
  let text = BASE_TEXT_370 + '\n\n';
  text += `Adicionalmente, describe e implementa un motor neuro-simbólico completo con las siguientes capas:\n`;
  for (let i = 1; i <= 10; i++) {
    text += `Capa ${i}: Gestión de memoria, serialización zero-copy en memoria compartida, despacho determinista de grafos de cómputo, validación estricta de invariantes de seguridad de Rust, manejo de ciclo de vida con Drop, backpressure con canales MPSC y soporte SIMD AVX2 para evaluación matricial vectorial.\n`;
  }
  text += `\nGenera un resumen técnico riguroso de cada subsistema y un árbol de dependencias detallado.\n`.repeat(3);
  return text;
}

export async function runSizeSuite(configName, targetSizes = [370, 1000, 3000], reps = 5) {
  console.log(`\n========================================================================`);
  console.log(`SUITE RIGUROSA DE VALIDACIÓN: ${configName}`);
  console.log(`Mínimo ${reps} repeticiones en FRÍO puro con Nonce único por corrida.`);
  console.log(`========================================================================`);

  const suiteSummary = {};

  for (const size of targetSizes) {
    console.log(`\n--- Evaluando tamaño aprox: ~${size} tokens (${reps} repeticiones en frío) ---`);
    const promptBase = getPrompt(size);
    const results = [];

    for (let r = 1; r <= reps; r++) {
      const nonce = `[VAL_${Date.now()}_R${r}_S${size}_${Math.random().toString(36).substring(2, 6)}]`;
      const fullPrompt = `${nonce}\n${promptBase}`;

      process.stdout.write(`  Repetición ${r}/${reps}... `);
      const res = await measureStream(
        { hostname: '127.0.0.1', port: 4000, path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        {
          messages: [
            { role: 'system', content: 'Eres un programador senior de sistemas de alto rendimiento.' },
            { role: 'user', content: fullPrompt }
          ],
          max_tokens: 25
        }
      );

      const prefillToks = Number((size / (res.ttft / 1000)).toFixed(2));
      res.prefillToks = prefillToks;
      console.log(`OK -> TTFT: ${res.ttft}ms (~${prefillToks} tok/s) | Decode: ${res.decodeSpeed} t/s | Chunk p50: ${res.interChunk.p50}ms`);
      results.push(res);

      if (r < reps) {
        await new Promise(res => setTimeout(res, 5000)); // Enfriamiento de 5s
      }
    }

    const ttftStats = stats(results.map(x => x.ttft));
    const decodeStats = stats(results.map(x => x.decodeSpeed));
    const prefillStats = stats(results.map(x => x.prefillToks));

    console.log(`  --> Resumen ~${size} tok: TTFT Mediana=${ttftStats.median}ms (Media=${ttftStats.mean}ms ± ${ttftStats.std}ms) | Prefill Mediana=${prefillStats.median} tok/s | Decode Mediana=${decodeStats.median} t/s`);
    suiteSummary[size] = { ttft: ttftStats, decode: decodeStats, prefill: prefillStats };
  }

  return suiteSummary;
}
