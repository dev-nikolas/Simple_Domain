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
              if (content) {
                tokenCount++;
              }
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

        // Estadísticas de latencia entre chunks
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

// Prompt representativo de ~350 tokens para medir Cold Prefill
const TECHNICAL_PROMPT = `
Diseña e implementa una arquitectura en Rust para un buffer circular concurrente libre de bloqueos (lock-free ring buffer).
Requisitos específicos:
1. Uso de AtomicPtr, AtomicUsize y ordenamiento de memoria Acquire-Release (std::sync::atomic::Ordering).
2. Prevención rigurosa del problema ABA mediante contadores de época o tagged pointers.
3. Métodos enqueue() y dequeue() seguros ante múltiples hilos productores y múltiples consumidores (MPMC).
4. Explicación de cómo mitigar el false sharing alineando las cabezas y colas a líneas de caché L1 (64 bytes).
Incluye código Rust completo con docstrings y manejo estricto de seguridad de memoria.
`;

export async function runBenchmark(testLabel, reps = 3) {
  console.log(`\n======================================================`);
  console.log(`TEST A/B: ${testLabel} (${reps} repeticiones en FRÍO puro)`);
  console.log(`======================================================`);

  const results = [];

  for (let i = 1; i <= reps; i++) {
    // Nonce único por repetición para asegurar prefill frío al 100%
    const nonce = `[AB_BENCHMARK_${Date.now()}_RUN_${i}_${Math.random().toString(36).substring(2, 7)}]`;
    const prompt = `${nonce}\n${TECHNICAL_PROMPT}`;

    process.stdout.write(`  Repetición ${i}/${reps}... `);
    const res = await measureStream(
      {
        hostname: '127.0.0.1',
        port: 4000,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        messages: [
          { role: 'system', content: 'Eres un programador senior experto en sistemas de alto rendimiento.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 60
      }
    );

    // Calcular velocidad de prefill aproximada: ~370 tokens / (ttft / 1000)
    const promptTokensAprox = 370;
    const prefillSpeed = Number((promptTokensAprox / (res.ttft / 1000)).toFixed(2));
    res.prefillSpeed = prefillSpeed;

    console.log(`OK -> TTFT Frío: ${res.ttft}ms (~${prefillSpeed} tok/s) | Decode: ${res.decodeSpeed} t/s | Chunk p50: ${res.interChunk.p50}ms, p95: ${res.interChunk.p95}ms, Max: ${res.interChunk.maxJitter}ms`);
    results.push(res);

    if (i < reps) {
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  // Mediana
  results.sort((a, b) => a.ttft - b.ttft);
  const median = results[Math.floor(results.length / 2)];

  console.log(`\n--> MEDIANA [${testLabel}]:`);
  console.log(`    TTFT Frío      : ${median.ttft} ms`);
  console.log(`    Prefill Frío   : ~${median.prefillSpeed} tok/s`);
  console.log(`    Decode Speed   : ${median.decodeSpeed} t/s`);
  console.log(`    SSE Chunk p50  : ${median.interChunk.p50} ms`);
  console.log(`    SSE Chunk p95  : ${median.interChunk.p95} ms`);
  console.log(`    SSE Max Jitter : ${median.interChunk.maxJitter} ms`);

  return median;
}

if (process.argv[1]?.endsWith('benchmark_ab_testing.mjs')) {
  runBenchmark(process.argv[2] || 'Prueba Actual').catch(console.error);
}

