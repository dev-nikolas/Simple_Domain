import http from 'http';

function measureStream(options, payload) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let ttft = null;
    let tokenCount = 0;
    let firstTokenTime = 0;

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
        }

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

        resolve({
          ttft,
          tokenCount,
          totalDuration: Number(totalDuration.toFixed(2)),
          decodeSpeed
        });
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function testPromptReduction() {
  console.log('=== EVALUACIÓN DE REDUCCIÓN DE TOKENS DE ENTRADA (PREFILL SAVINGS) ===\n');

  // Caso 1: Prompt largo con preámbulo verboso y formato redundante (~350 tokens)
  const verboseSystem = `Eres un asistente de inteligencia artificial avanzado creado para asistir a ingenieros de software profesionales. Tu comportamiento debe ser cortés, profesional, analítico y exhaustivo. Al responder a preguntas de código, debes incluir contexto histórico, mejores prácticas recomendadas por la industria, consideraciones de seguridad, alternativas de diseño y explicaciones exhaustivas paso a paso de cada línea de código antes y después del bloque.`;
  const verboseUser = `Por favor, te solicito que de manera muy detallada y exhaustiva, teniendo en cuenta todas las mejores prácticas de programación en TypeScript moderno y seguro, me expliques e implementes una función debounce genérica que reciba una función y una demora en milisegundos, tipada estrictamente con genéricos, Parameters<T> y ReturnType<T>, y me expliques línea por línea cómo funciona el timer y por qué se usa clearTimeout.`;

  // Caso 2: Prompt conciso optimizado (~60 tokens)
  const leanSystem = `Eres un asistente dev conciso.`;
  const leanUser = `Implementa una función debounce genérica en TypeScript con Parameters<T> y clearTimeout.`;

  console.log('[Caso 1] Prompt Verboso (~350 tokens, en frío)...');
  const nonce1 = `[VERB_${Date.now()}]`;
  const resVerbose = await measureStream(
    { hostname: '127.0.0.1', port: 4000, path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      messages: [
        { role: 'system', content: `${nonce1} ${verboseSystem}` },
        { role: 'user', content: verboseUser }
      ],
      max_tokens: 60
    }
  );
  console.log(`  -> TTFT: ${resVerbose.ttft} ms | Total: ${resVerbose.totalDuration}s`);

  await new Promise(r => setTimeout(r, 6000));

  console.log('\n[Caso 2] Prompt Conciso / Podado (~60 tokens, en frío)...');
  const nonce2 = `[LEAN_${Date.now()}]`;
  const resLean = await measureStream(
    { hostname: '127.0.0.1', port: 4000, path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      messages: [
        { role: 'system', content: `${nonce2} ${leanSystem}` },
        { role: 'user', content: leanUser }
      ],
      max_tokens: 60
    }
  );
  console.log(`  -> TTFT: ${resLean.ttft} ms | Total: ${resLean.totalDuration}s`);

  const savedMs = resVerbose.ttft - resLean.ttft;
  const savedSec = (savedMs / 1000).toFixed(2);
  const reductionPct = (((resVerbose.ttft - resLean.ttft) / resVerbose.ttft) * 100).toFixed(1);

  console.log('\n======================================================');
  console.log(`RESULTADO DE REDUCCIÓN DE TOKENS:`);
  console.log(`- TTFT Caso Verboso : ${resVerbose.ttft} ms`);
  console.log(`- TTFT Caso Conciso : ${resLean.ttft} ms`);
  console.log(`- Ahorro de Latencia : ${savedSec}s menos de espera inicial (-${reductionPct}%)`);
  console.log('======================================================');
}

testPromptReduction().catch(console.error);

