import http from 'http';
import { execSync } from 'child_process';

function getCpuInfo() {
  try {
    const raw = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor).CurrentClockSpeed"', { encoding: 'utf-8' }).trim();
    return `${raw} MHz`;
  } catch {
    return 'N/A';
  }
}

function requestStream(options, payload) {
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

function stats(arr) {
  const n = arr.length;
  if (n === 0) return { mean: 0, std: 0, min: 0, max: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1 || 1);
  const std = Math.sqrt(variance);
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  return {
    mean: Number(mean.toFixed(2)),
    std: Number(std.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2))
  };
}

async function runVarianceTest() {
  console.log('=== MEDICIÓN DE VARIANZA BASE (5 REPETICIONES CON ENFRIAMIENTO) ===');
  console.log('Objetivo: Establecer umbral de ruido para decode y prefill en frío.\n');

  // Texto base de ~150 tokens
  const basePrompt = `Explica en detalle los tres principios de arquitectura para microservicios resilientes:
1. Circuit Breaker pattern con límites de tolerancia.
2. Backpressure y flow control reactivo.
3. Bulkheading para aislamiento de fallos catastróficos.
Asegúrate de incluir ejemplos claros en TypeScript o Rust.`;

  const results = [];

  for (let i = 1; i <= 5; i++) {
    // Nonce único al INICIO para garantizar 0% reuso de KV cache (Cold Prefill puro)
    const nonce = `[TEST_RUN_${Date.now()}_ID_${Math.random().toString(36).substring(2, 8)}]`;
    const prompt = `${nonce}\n${basePrompt}`;

    const cpuBefore = getCpuInfo();
    console.log(`--- Repetición ${i}/5 --- [CPU Clock: ${cpuBefore}]`);
    
    const res = await requestStream(
      {
        hostname: '127.0.0.1',
        port: 4000,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80
      }
    );

    const cpuAfter = getCpuInfo();
    console.log(`  -> TTFT Frío: ${res.ttft} ms | Decode: ${res.decodeSpeed} t/s (${res.tokenCount} tok en ${res.totalDuration}s) | CPU Clock Fin: ${cpuAfter}`);
    results.push(res);

    if (i < 5) {
      console.log('  [Pausa de enfriamiento 10s...]');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  const ttftColdList = results.map(r => r.ttft);
  const decodeList = results.map(r => r.decodeSpeed);

  const ttftStats = stats(ttftColdList);
  const decodeStats = stats(decodeList);

  console.log('\n======================================================');
  console.log('ESTADÍSTICAS Y UMBRAL DE VARIANZA BASELINE:');
  console.log(`TTFT Frío (ms) : Media = ${ttftStats.mean} ms | Desv. Estándar = ${ttftStats.std} ms | Rango = [${ttftStats.min}, ${ttftStats.max}] ms`);
  console.log(`Decode (t/s)   : Media = ${decodeStats.mean} t/s | Desv. Estándar = ${decodeStats.std} t/s | Rango = [${decodeStats.min}, ${decodeStats.max}] t/s`);
  console.log(`\nUMBRAL DE RUIDO OFICIAL:`);
  console.log(`- Decode: ±${decodeStats.std} t/s. Cualquier cambio con diferencia <= ${decodeStats.std} t/s se considerará RUIDO.`);
  console.log(`- TTFT Frío: ±${ttftStats.std} ms.`);
  console.log('======================================================');
}

runVarianceTest().catch(console.error);

