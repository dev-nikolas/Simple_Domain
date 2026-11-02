import http from 'http';

const agent = new http.Agent({ keepAlive: false });

function postChat(payload) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let ttft = null;
    let fullText = '';

    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/v1/chat/completions',
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
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
    req.write(postData);
    req.end();
  });
}

async function runScenario(tokenTarget) {
  console.log(`\n========================================================================`);
  console.log(`TEST DE DESALOJO Y RESTAURACIÓN INTEGRADA EN GATEWAY (Target: ~${tokenTarget} tokens)`);
  console.log(`Flujo: Sesión A -> Sesión B -> Sesión C -> Regreso a Sesión A`);
  console.log(`========================================================================`);

  const baseText = `// Implementación de kernel de alto rendimiento en Rust\n` +
    `pub struct FastMatrix<T: Copy> { data: Vec<T>, rows: usize, cols: usize }\n`;
  const repeats = Math.max(1, Math.floor(tokenTarget / 15));
  const promptA = baseText.repeat(repeats);

  const sessionIdA = `test_session_A_${tokenTarget}`;
  const sessionIdB = `test_session_B_${tokenTarget}`;
  const sessionIdC = `test_session_C_${tokenTarget}`;

  // 1. Ejecutar Sesión A
  console.log(`[Paso 1] Enviando primer mensaje de Sesión A (${sessionIdA})...`);
  const resA1 = await postChat({
    session_id: sessionIdA,
    messages: [
      { role: 'system', content: 'Eres un programador senior.' },
      { role: 'user', content: promptA }
    ],
    max_tokens: 5
  });
  console.log(`  -> Sesión A iniciada: TTFT = ${resA1.ttft} ms`);

  // Esperar 6 segundos para que el debounce del Gateway guarde el snapshot a disco
  console.log('  -> Esperando 6s para que el debounce del Gateway guarde el snapshot...');
  await new Promise(r => setTimeout(r, 6000));

  // 2. Ejecutar Sesión B (ocupa Slot 1)
  console.log(`\n[Paso 2] Enviando Sesión B (${sessionIdB}) para ocupar Slot 1...`);
  await postChat({
    session_id: sessionIdB,
    messages: [{ role: 'user', content: 'Explica los tipos de índices B-tree en motores SQL.' }],
    max_tokens: 5
  });
  console.log('  -> Sesión B ejecutada en Slot 1.');

  // 3. Ejecutar Sesión C (ocupa Slot 0, desalojando a Sesión A de la RAM)
  console.log(`\n[Paso 3] Enviando Sesión C (${sessionIdC}) para ocupar Slot 0 (desalojo de A)...`);
  await postChat({
    session_id: sessionIdC,
    messages: [{ role: 'user', content: 'Explica la concurrencia lock-free con AtomicUsize.' }],
    max_tokens: 5
  });
  console.log('  -> Sesión C ejecutada en Slot 0. Sesión A está 100% desalojada de RAM.');

  await new Promise(r => setTimeout(r, 2000));

  // 4. Regreso a Sesión A: El Gateway debe restaurar el snapshot y servir el seguimiento
  console.log(`\n[Paso 4] Regresando a Sesión A (${sessionIdA}) con mensaje de seguimiento...`);
  const tReturnStart = performance.now();
  const resA_FollowUp = await postChat({
    session_id: sessionIdA,
    messages: [
      { role: 'system', content: 'Eres un programador senior.' },
      { role: 'user', content: promptA },
      { role: 'assistant', content: 'OK.' },
      { role: 'user', content: '¿Qué complejidad temporal tiene la inicialización?' }
    ],
    max_tokens: 5
  });
  const totalReturnTimeMs = Math.round(performance.now() - tReturnStart);
  console.log(`  -> RESPUESTA RECIBIDA: TTFT Punta a Punta = ${resA_FollowUp.ttft} ms (Tiempo Total HTTP: ${totalReturnTimeMs} ms)`);

  return {
    target: tokenTarget,
    coldInitialTtftMs: resA1.ttft,
    returnEndToEndTtftMs: resA_FollowUp.ttft
  };
}

async function main() {
  const r500 = await runScenario(500);
  const r1500 = await runScenario(1500);

  console.log('\n======================================================');
  console.log('RESUMEN DE VALIDACIÓN END-TO-END GATEWAY RESTORE:');
  console.table([r500, r1500]);
}

main().catch(console.error);

