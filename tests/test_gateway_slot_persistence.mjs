import http from 'http';

const agent = new http.Agent({ keepAlive: false });

function getJson(urlStr) {
  return new Promise((resolve, reject) => {
    const req = http.get(urlStr, { agent }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    });
    req.on('error', reject);
  });
}

function postJson(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); } catch { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

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

async function waitForIdle() {
  for (let i = 0; i < 40; i++) {
    try {
      const slots = await getJson('http://127.0.0.1:8081/slots');
      if (slots && !slots[0]?.is_processing && !slots[1]?.is_processing) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
}

async function main() {
  console.log('=== TEST DE PERSISTENCIA DE KV POR SESIÓN (DESALOJO Y RESTAURACIÓN) ===');

  await waitForIdle();

  // Historial largo para Sesión A (~520 tokens)
  const sessionAPrompt = `Implementa un parser recursivo descendente en Rust para expresiones aritméticas complejas.
Incluye soporte para:
1. Operadores binarios: +, -, *, /, ^ con precedencia estricta y asociatividad a la derecha para potencias.
2. Funciones unarias: sin, cos, tan, exp, ln, sqrt y soporte de negación unaria.
3. Manejo detallado de errores con enum ParseError (TokenInesperado, ParentesisNoCerrado, DivisionPorCero).
4. Generación de Árbol de Sintaxis Abstracta (AST) tipado y evaluación sin recursión infinita mediante Box<Expr>.
Docstrings y cobertura completa de pruebas unitarias con macro assert_eq!.`.repeat(2);

  // Prompts para desalojo (Sesión B y C)
  const sessionBPrompt = `Explica los algoritmos de ordenamiento externo en base de datos PostgreSQL, detallando external merge sort y work_mem.`.repeat(2);
  const sessionCPrompt = `Describe la arquitectura de un compilador JIT moderno como V8 (Ignition y Turbofan) y cómo gestiona deopt transitions.`.repeat(2);

  // 1. Ejecutar Sesión A
  console.log('\n[Paso 1] Ejecutando Sesión A (Prompt largo ~520 tokens)...');
  const runA1 = await chat([
    { role: 'system', content: 'Eres un programador senior.' },
    { role: 'user', content: sessionAPrompt }
  ], 5);
  console.log(`  -> Sesión A ejecutada. TTFT = ${runA1.ttft} ms`);

  await waitForIdle();

  // 2. Guardar estado de Sesión A a disco
  console.log('\n[Paso 2] Guardando slot de Sesión A a disco como "session_A.bin"...');
  const saveRes = await postJson('http://127.0.0.1:8081/slots/0?action=save', { filename: 'session_A.bin' });
  console.log(`  -> Guardado completado: ${saveRes.body?.n_saved} tokens en ${saveRes.body?.timings?.save_ms?.toFixed(1)} ms`);

  await waitForIdle();

  // 3. Desalojar Sesión A llenando los 2 slots con Sesión B y C
  console.log('\n[Paso 3] Desalojando Sesión A de la memoria RAM ejecutando Sesión B (Slot 1) y Sesión C (Slot 0)...');
  await chat([{ role: 'system', content: 'Eres un experto en BD.' }, { role: 'user', content: sessionBPrompt }], 2);
  await waitForIdle();
  await chat([{ role: 'system', content: 'Eres un experto en JIT.' }, { role: 'user', content: sessionCPrompt }], 2);
  await waitForIdle();
  console.log('  -> Sesión A completamente desalojada de ambos slots.');

  // 4. Caso 1: Regreso a Sesión A SIN Restauración (Recálculo en Frío)
  console.log('\n[Paso 4] CASO 1: Regresando a Sesión A SIN Restauración (Recálculo)...');
  const runA_NoRestore = await chat([
    { role: 'system', content: 'Eres un programador senior.' },
    { role: 'user', content: sessionAPrompt },
    { role: 'assistant', content: 'Entendido el requerimiento del parser.' },
    { role: 'user', content: '¿Cómo agregarías soporte para variables?' }
  ], 5);
  console.log(`  -> TTFT SIN Restauración (Recálculo): ${runA_NoRestore.ttft} ms`);

  await waitForIdle();

  // 5. Desalojar de nuevo con B y C
  console.log('\n[Paso 5] Desalojando nuevamente Sesión A de ambos slots...');
  await chat([{ role: 'system', content: 'Eres un experto en BD.' }, { role: 'user', content: sessionBPrompt }], 2);
  await waitForIdle();
  await chat([{ role: 'system', content: 'Eres un experto en JIT.' }, { role: 'user', content: sessionCPrompt }], 2);
  await waitForIdle();

  // 6. Caso 2: Regreso a Sesión A CON Restauración desde Disco
  console.log('\n[Paso 6] CASO 2: Restaurando "session_A.bin" en Slot 0 desde disco...');
  const tRestoreStart = performance.now();
  const restoreRes = await postJson('http://127.0.0.1:8081/slots/0?action=restore', { filename: 'session_A.bin' });
  const restoreDurationMs = Math.round(performance.now() - tRestoreStart);
  console.log(`  -> Restauración en disco: ${restoreDurationMs} ms (timings.restore_ms: ${restoreRes.body?.timings?.restore_ms?.toFixed(1)} ms)`);

  await waitForIdle();

  console.log('  -> Enviando mensaje de seguimiento a Sesión A con slot restaurado...');
  const runA_Restored = await chat([
    { role: 'system', content: 'Eres un programador senior.' },
    { role: 'user', content: sessionAPrompt },
    { role: 'assistant', content: 'Entendido el requerimiento del parser.' },
    { role: 'user', content: '¿Cómo agregarías soporte para variables?' }
  ], 5);
  console.log(`  -> TTFT con Slot Restaurado: ${runA_Restored.ttft} ms`);

  const totalRestoredPipeline = restoreDurationMs + runA_Restored.ttft;
  const timeSavedMs = runA_NoRestore.ttft - totalRestoredPipeline;
  const speedupPct = ((timeSavedMs / runA_NoRestore.ttft) * 100).toFixed(1);

  console.log('\n======================================================');
  console.log('RESULTADO FINAL DEL EXPERIMENTO DE PERSISTENCIA POR SESIÓN:');
  console.log(`- TTFT SIN Restauración (Recálculo en Frío) : ${runA_NoRestore.ttft} ms`);
  console.log(`- Tiempo de Restauración desde Disco        : ${restoreDurationMs} ms`);
  console.log(`- TTFT con Slot Restaurado (Hot Inferencia) : ${runA_Restored.ttft} ms`);
  console.log(`- TIEMPO TOTAL CON RESTAURACIÓN             : ${totalRestoredPipeline} ms`);
  console.log(`- AHORRO NETO DE TIEMPO                     : ${timeSavedMs} ms (-${speedupPct}%)`);
  console.log('======================================================');
}

main().catch(console.error);
