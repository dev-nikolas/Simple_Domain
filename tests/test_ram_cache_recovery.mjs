import http from 'http';

const agent = new http.Agent({ keepAlive: false });

function chat(messages, maxTokens = 5) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let ttft = null;
    let fullText = '';

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8081,
      path: '/v1/chat/completions',
      method: 'POST',
      agent,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      res.on('data', (chunk) => {
        if (ttft === null) ttft = Math.round(performance.now() - start);
        fullText += chunk.toString();
      });
      res.on('end', () => {
        resolve({
          ttft,
          totalDuration: (performance.now() - start) / 1000,
          fullText
        });
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ messages, max_tokens: maxTokens, stream: true }));
    req.end();
  });
}

async function main() {
  console.log('=== TEST CORTO: RECUPERACIÓN DE SESIÓN EN RAM (A -> B -> C -> A SIN RESTORE DE DISCO) ===');

  const baseText = `// Implementación de kernel de alto rendimiento en Rust\n` +
    `pub struct FastMatrix<T: Copy> { data: Vec<T>, rows: usize, cols: usize }\n`;
  // ~1000 tokens reales
  const promptA = baseText.repeat(70);

  // 1. Sesión A inicial
  console.log('[1/4] Ejecutando Sesión A inicial (~1000 tokens)...');
  const runA1 = await chat([
    { role: 'system', content: 'Eres un programador senior.' },
    { role: 'user', content: promptA }
  ], 5);
  console.log(`  -> Sesión A inicial evaluada: TTFT = ${runA1.ttft} ms`);

  await new Promise(r => setTimeout(r, 2000));

  // 2. Sesión B (ocupa Slot 1)
  console.log('[2/4] Ejecutando Sesión B (ocupa Slot 1)...');
  await chat([{ role: 'user', content: 'Explica los tipos de índices B-tree en PostgreSQL.' }], 5);

  await new Promise(r => setTimeout(r, 2000));

  // 3. Sesión C (ocupa Slot 0, desalojando A de los slots)
  console.log('[3/4] Ejecutando Sesión C (ocupa Slot 0, desalojando a A)...');
  await chat([{ role: 'user', content: 'Explica la concurrencia lock-free con AtomicUsize.' }], 5);

  await new Promise(r => setTimeout(r, 2000));

  // 4. Regreso a Sesión A SIN NINGUNA RESTAURACIÓN DE DISCO
  console.log('[4/4] Regresando a Sesión A SIN restore de disco (¿-cram en RAM lo recupera?)...');
  const tStart = performance.now();
  const runA_Return = await chat([
    { role: 'system', content: 'Eres un programador senior.' },
    { role: 'user', content: promptA },
    { role: 'assistant', content: 'OK.' },
    { role: 'user', content: '¿Qué complejidad temporal tiene la inicialización?' }
  ], 5);
  const totalReturnMs = Math.round(performance.now() - tStart);

  console.log('\n======================================================');
  console.log(`TTFT Real de Regreso SIN Restore de Disco : ${runA_Return.ttft} ms`);
  console.log(`Tiempo Total de Respuesta                : ${totalReturnMs} ms`);
  if (runA_Return.ttft < 3000) {
    console.log('RESULTADO: El caché de prompts en RAM (-cram) SÍ recuperó la sesión por sí solo.');
  } else {
    console.log('RESULTADO: El caché de RAM NO la recuperó. Tuvo que recalcular todo el historial.');
  }
  console.log('======================================================');
}

main().catch(console.error);

