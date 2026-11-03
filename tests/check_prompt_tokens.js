import http from 'http';

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
        try {
          resolve(JSON.parse(data).tokens?.length || 0);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ content }));
    req.end();
  });
}

// 1. Prompts de benchmark_fase1.mjs
function generatePromptFase1(approxTokens) {
  const baseSnippet = `// Rust concurrent LRU cache block with atomic reference count
pub struct CacheEntry<K: Eq + std::hash::Hash, V: Clone> {
    key: K,
    val: V,
    access_count: std::sync::atomic::AtomicUsize,
}
`;
  const repeats = Math.max(1, Math.floor((approxTokens * 4) / baseSnippet.length));
  let text = baseSnippet.repeat(repeats);
  const targetChars = approxTokens * 4;
  if (text.length > targetChars) text = text.substring(0, targetChars);
  return `${text}\n\nEscribe una función en Rust para calcular estadísticas de acceso sobre este LRU.`;
}

// 2. Prompts de benchmark_rigorous_validation.mjs
const BASE_TEXT_370 = `Diseña una arquitectura en Rust para un buffer concurrente sin bloqueos (lock-free ring buffer).
Requisitos:
1. AtomicPtr, AtomicUsize y orden Acquire-Release.
2. Prevención de ABA con contadores de época.
3. Métodos enqueue/dequeue MPMC seguros.
4. Alineación a líneas de caché L1 de 64 bytes para mitigar false sharing.
Docstrings y seguridad de memoria garantizada.`;

function getPromptValidation(targetTokens) {
  if (targetTokens <= 400) return BASE_TEXT_370;
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

async function main() {
  console.log('--- TOKENS REALES EN BENCHMARK FASE 1 (generatePrompt) ---');
  const f1_100 = generatePromptFase1(100);
  const f1_1000 = generatePromptFase1(1000);
  const f1_3000 = generatePromptFase1(3000);
  console.log('Fase1 "100 tok": Chars =', f1_100.length, '| Tokens reales =', await tokenize(f1_100));
  console.log('Fase1 "1000 tok": Chars =', f1_1000.length, '| Tokens reales =', await tokenize(f1_1000));
  console.log('Fase1 "3000 tok": Chars =', f1_3000.length, '| Tokens reales =', await tokenize(f1_3000));

  console.log('\n--- TOKENS REALES EN BENCHMARK RIGUROSO (getPrompt) ---');
  const val_370 = getPromptValidation(370);
  const val_1000 = getPromptValidation(1000);
  const val_3000 = getPromptValidation(3000);
  console.log('Val "370 tok": Chars =', val_370.length, '| Tokens reales =', await tokenize(val_370));
  console.log('Val "1000 tok": Chars =', val_1000.length, '| Tokens reales =', await tokenize(val_1000));
  console.log('Val "3000 tok": Chars =', val_3000.length, '| Tokens reales =', await tokenize(val_3000));
}

main().catch(console.error);

