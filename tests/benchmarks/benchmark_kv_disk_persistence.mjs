import http from 'http';

function getJson(urlStr) {
  return new Promise((resolve, reject) => {
    const req = http.get(urlStr, (res) => {
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
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function waitForSlotIdle(slotId = 0) {
  for (let i = 0; i < 40; i++) {
    try {
      const slots = await getJson('http://127.0.0.1:8081/slots');
      if (slots && slots[slotId] && !slots[slotId].is_processing) {
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
}

function tokenize(content) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8081,
      path: '/tokenize',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve(JSON.parse(data).tokens?.length || 0);
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ content }));
    req.end();
  });
}

function chatWithModel(messages, maxTokens = 1) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let ttft = null;
    let fullText = '';

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8081,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 180000
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

async function buildPromptOfTargetTokens(targetTokens) {
  const baseBlock = `// Implementación de kernel de computación paralela en Rust con SIMD AVX2\n` +
    `pub struct MatrixBlock<T: Copy + std::ops::Add<Output = T>> {\n` +
    `    data: Vec<T>,\n` +
    `    rows: usize,\n` +
    `    cols: usize,\n` +
    `}\n`;
  
  let currentText = baseBlock;
  let tokens = await tokenize(currentText);

  while (tokens < targetTokens) {
    const needed = targetTokens - tokens;
    const repeats = Math.max(1, Math.floor(needed / 30));
    currentText += baseBlock.repeat(repeats);
    tokens = await tokenize(currentText);
  }

  return { text: currentText, exactTokens: tokens };
}

async function runKvPersistenceBenchmark() {
  console.log('=== BENCHMARK DE PERSISTENCIA KV EN DISCO (--slot-save-path) ===');
  console.log('Objetivo: Comparar tiempo de Restauración desde Disco vs Recálculo (Prefill) para ~500, ~1500 y ~3000 tokens.\n');

  await waitForSlotIdle(0);

  const targets = [500, 1500, 3000];
  const results = [];

  for (const target of targets) {
    console.log(`\n======================================================`);
    console.log(`[Escenario: ~${target} tokens de historial]`);
    const { text, exactTokens } = await buildPromptOfTargetTokens(target);
    console.log(`Tokens reales en el prompt: ${exactTokens} tokens`);

    // 1. Limpiar slot 0
    await postJson('http://127.0.0.1:8081/slots/0?action=erase', {});
    await waitForSlotIdle(0);

    // 2. Medir Recálculo en frío puro (prefill de la conversación completa)
    console.log(`  [1] Ejecutando prefill en frío puro (Recálculo)...`);
    const coldRun = await chatWithModel([
      { role: 'system', content: 'Eres un programador senior.' },
      { role: 'user', content: text }
    ], 1);
    console.log(`  -> TTFT Recálculo en Frío: ${coldRun.ttft} ms (~${(exactTokens / (coldRun.ttft / 1000)).toFixed(2)} tok/s)`);

    await waitForSlotIdle(0);

    // 3. Guardar el slot a disco
    const fileName = `slot_${target}.bin`;
    console.log(`  [2] Guardando Slot 0 a disco (${fileName})...`);
    const tSaveStart = performance.now();
    const saveRes = await postJson('http://127.0.0.1:8081/slots/0?action=save', { filename: fileName });
    const saveWallMs = Math.round(performance.now() - tSaveStart);
    const writtenBytes = saveRes.body?.n_written || 0;
    const writtenMb = (writtenBytes / (1024 * 1024)).toFixed(2);
    console.log(`  -> Slot guardado: ${writtenMb} MB en ${saveWallMs} ms (timings.save_ms: ${saveRes.body?.timings?.save_ms?.toFixed(1) || 0} ms)`);

    await waitForSlotIdle(0);

    // 4. Limpiar slot 0 (simulando desalojo completo de la sesión)
    console.log(`  [3] Desalojando Slot 0 (simulación de sesión desalojada)...`);
    await postJson('http://127.0.0.1:8081/slots/0?action=erase', {});
    await waitForSlotIdle(0);

    // 5. Restaurar el slot desde disco
    console.log(`  [4] Restaurando Slot 0 desde disco (${fileName})...`);
    const tRestoreStart = performance.now();
    const restoreRes = await postJson('http://127.0.0.1:8081/slots/0?action=restore', { filename: fileName });
    const restoreWallMs = Math.round(performance.now() - tRestoreStart);
    const readBytes = restoreRes.body?.n_read || 0;
    const readMb = (readBytes / (1024 * 1024)).toFixed(2);
    console.log(`  -> Slot restaurado: ${readMb} MB en ${restoreWallMs} ms (timings.restore_ms: ${restoreRes.body?.timings?.restore_ms?.toFixed(1) || 0} ms)`);

    await waitForSlotIdle(0);

    // 6. Enviar nuevo turno sobre el slot restaurado (Medir TTFT en Caliente)
    console.log(`  [5] Ejecutando turno de seguimiento con slot restaurado (Caché Caliente)...`);
    const hotRun = await chatWithModel([
      { role: 'system', content: 'Eres un programador senior.' },
      { role: 'user', content: text },
      { role: 'assistant', content: 'OK.' },
      { role: 'user', content: '¿Qué optimizaciones recomiendas?' }
    ], 5);
    console.log(`  -> TTFT con Slot Restaurado: ${hotRun.ttft} ms`);

    const totalPipelineMs = restoreWallMs + hotRun.ttft;
    const diffMs = coldRun.ttft - totalPipelineMs;
    const gainPct = ((diffMs / coldRun.ttft) * 100).toFixed(1);

    results.push({
      targetTokens: exactTokens,
      fileSizeMb: Number(writtenMb),
      saveTimeMs: saveWallMs,
      restoreTimeMs: restoreWallMs,
      coldTtftMs: coldRun.ttft,
      hotTtftMs: hotRun.ttft,
      totalPipelineMs,
      savedMs: diffMs,
      gainPct: `${gainPct}%`,
      decision: diffMs > 0 ? 'RESTAURAR GANA' : 'RECÁLCULO GANA'
    });
  }

  console.log('\n========================================================================================');
  console.log('TABLA COMPARATIVA FINAL: RESTAURACIÓN EN DISCO VS RECÁLCULO (PREFILL EN FRÍO):');
  console.table(results);
}

runKvPersistenceBenchmark().catch(console.error);
