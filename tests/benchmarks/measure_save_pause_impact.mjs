import http from 'http';

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

async function measureSaveImpact() {
  console.log('=== EXPERIMENTO: IMPACTO DEL GUARDADO EN DISCO SOBRE GENERACIÓN ACTIVA ===');
  console.log('Objetivo: Medir si ejecutar POST /slots/0?action=save pausa el stream en Slot 1.\n');

  // 1. Inicializar slot 0 con un prompt de ~600 tokens
  console.log('[Paso 1] Cargando 600 tokens en Slot 0...');
  const promptSlot0 = 'Implementa un kernel concurrente en Rust. '.repeat(60);
  await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8081,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.write(JSON.stringify({
      messages: [{ role: 'user', content: promptSlot0 }],
      max_tokens: 1,
      stream: true
    }));
    req.end();
  });
  console.log('Slot 0 cargado.');

  await new Promise(r => setTimeout(r, 2000));

  // 2. Iniciar generación continua en Slot 1 (80 tokens) y registrar tiempos entre chunks
  console.log('\n[Paso 2] Iniciando generación de 80 tokens en Slot 1 y monitoreando latencia inter-chunk...');
  const interChunkDeltas = [];
  let lastTime = performance.now();
  let saveTriggered = false;
  let saveDurationMs = 0;
  let pauseObservedMs = 0;

  await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8081,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let tokenIdx = 0;
      res.on('data', async () => {
        const now = performance.now();
        const delta = Math.round(now - lastTime);
        lastTime = now;
        tokenIdx++;
        interChunkDeltas.push(delta);

        // Cuando Slot 1 lleve 25 tokens generados, lanzar el guardado de Slot 0 en paralelo
        if (tokenIdx === 25 && !saveTriggered) {
          saveTriggered = true;
          console.log(`  -> [Token ${tokenIdx}] Disparando POST /slots/0?action=save en paralelo mientras Slot 1 genera...`);
          const t0 = performance.now();
          postJson('http://127.0.0.1:8081/slots/0?action=save', { filename: 'test_save_impact.bin' }).then((resSave) => {
            saveDurationMs = Math.round(performance.now() - t0);
            console.log(`  -> [Slot 0 Save Finalizado] Duró ${saveDurationMs} ms (timings.save_ms: ${resSave.body?.timings?.save_ms?.toFixed(1)} ms)`);
          });
        }
      });

      res.on('end', resolve);
    });

    req.write(JSON.stringify({
      messages: [{ role: 'user', content: 'Cuenta del 1 al 80 describiendo cada número en detalle.' }],
      max_tokens: 80,
      stream: true
    }));
    req.end();
  });

  // Analizar deltas
  // Los primeros tokens (antes del save): tokens 5..24
  const normalDeltas = interChunkDeltas.slice(5, 24);
  const normalAvg = normalDeltas.reduce((a, b) => a + b, 0) / (normalDeltas.length || 1);

  // El delta máximo ocurrido durante el save (tokens 25..35)
  const duringSaveDeltas = interChunkDeltas.slice(25, 40);
  const maxDuringSave = Math.max(...duringSaveDeltas);
  pauseObservedMs = Math.max(0, Math.round(maxDuringSave - normalAvg));

  console.log('\n======================================================');
  console.log('RESULTADO DE MEDICIÓN DE IMPACTO:');
  console.log(`- Latencia inter-chunk normal en Slot 1: ~${normalAvg.toFixed(1)} ms`);
  console.log(`- Duración de la operación de guardado  : ${saveDurationMs} ms`);
  console.log(`- Latencia inter-chunk pico durante save: ${maxDuringSave} ms`);
  console.log(`- Pausa neta observada en la generación : +${pauseObservedMs} ms`);
  console.log('======================================================');
}

measureSaveImpact().catch(console.error);

