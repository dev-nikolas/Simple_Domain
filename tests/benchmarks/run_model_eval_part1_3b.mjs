import http from 'http';
import fs from 'fs';

const agent = new http.Agent({ keepAlive: false });

const BASE_SYSTEM_PROMPT = 'Eres un desarrollador de software senior, preciso y eficiente.';
const CONCISE_SYSTEM_PROMPT = 'Eres un desarrollador de software senior, preciso y eficiente. Sé directo y conciso: escribe únicamente el código necesario y comentarios esenciales sin preámbulos, introducciones ni despedidas.';

const PROMPTS = [
  {
    id: 1,
    title: 'Función: Cola de tareas asíncronas con reintentos y jitter (TypeScript)',
    prompt: 'Implementa en TypeScript una clase TaskQueue con concurrencia máxima configurable (concurrency: number), método addTask<T>(task: () => Promise<T>, retries?: number): Promise<T>, y reintentos automáticos con backoff exponencial y jitter ante errores.'
  },
  {
    id: 2,
    title: 'Bug / Depuración: Concurrencia multihilo con SQLite (Python)',
    prompt: `Encuentra y explica el error de concurrencia en este fragmento Python y escribe la versión corregida y segura para hilos:
\`\`\`python
import threading
import sqlite3

class EventLogger:
    def __init__(self, db_path='events.db'):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self.cursor.execute('CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, msg TEXT)')
        self.conn.commit()

    def log(self, msg):
        self.cursor.execute('INSERT INTO logs (msg) VALUES (?)', (msg,))
        self.conn.commit()

logger = EventLogger()
threads = [threading.Thread(target=logger.log, args=(f'event_{i}',)) for i in range(10)]
for t in threads: t.start()
for t in threads: t.join()
\`\`\``
  },
  {
    id: 3,
    title: 'Explicación técnica: epoll EPOLLLT vs EPOLLET y socket starvation (Linux/C)',
    prompt: 'Explica la diferencia técnica de kernel entre epoll con EPOLLLT (level-triggered) y EPOLLET (edge-triggered). ¿Qué condición provoca inanición de sockets (socket starvation) bajo alta carga en modo edge-triggered y qué patrón con sockets no bloqueantes y bucle read/recv previene este problema?'
  },
  {
    id: 4,
    title: 'Script: Verificador de salud HTTP concurrente con asyncio y tabla ASCII (Python)',
    prompt: 'Escribe un script en Python 3 usando asyncio y httpx que tome una lista de URLs, ejecute chequeos concurrentes limitados a 10 tareas simultáneas mediante Semaphore, mida TTFB con timeout de 3s, capture excepciones de conexión, y formatee la salida final en una tabla ASCII ordenada por latencia.'
  },
  {
    id: 5,
    title: 'Tipado avanzado: DeepReadonly<T> recursivo (TypeScript)',
    prompt: 'Diseña el tipo utilitario genérico DeepReadonly<T> en TypeScript estricto. Debe hacer recursivamente readonly a objetos, arrays, tuplas, Map y Set, pero debe preservar intactos tipos primitivos, funciones, RegExp y Date.'
  },
  {
    id: 6,
    title: 'Concurrencia / Memory Ordering: Spinlock Relaxed vs Acquire/Release (Rust)',
    prompt: `Analiza este intento de spinlock en Rust:
\`\`\`rust
use std::sync::atomic::{AtomicBool, Ordering};

pub struct SpinLock {
    locked: AtomicBool,
}

impl SpinLock {
    pub fn new() -> Self {
        Self { locked: AtomicBool::new(false) }
    }
    pub fn lock(&self) {
        while self.locked.swap(true, Ordering::Relaxed) {
            std::hint::spin_loop();
        }
    }
    pub fn unlock(&self) {
        self.locked.store(false, Ordering::Relaxed);
    }
}
\`\`\`
¿Por qué Ordering::Relaxed es incorrecto y permite dataraces en arquitecturas débilmente ordenadas (ARM)? Indica la combinación mínima de ordenamiento de memoria (Acquire/Release) requerida y escribe el código corregido.`
  },
  {
    id: 7,
    title: 'Streams / Backpressure: Pipeline de descompresión y validación CSV (Node.js)',
    prompt: 'Implementa en Node.js moderno usando stream.pipeline, zlib.createGunzip y stream.Transform un flujo que procese un archivo CSV comprimido (.csv.gz) de varios gigabytes línea por línea: valide que contenga 4 columnas numéricas requeridas, envíe los registros válidos al stdout y escriba las líneas corruptas en un archivo de errores, garantizando manejo correcto de contrapresión (backpressure).'
  },
  {
    id: 8,
    title: 'Patrón de arquitectura: Transactional Outbox para mensajería fiable (Python)',
    prompt: 'Describe e implementa en Python (con SQL o SQLAlchemy / psycopg) el patrón Transactional Outbox para emitir eventos hacia RabbitMQ/Kafka al guardar una entidad Order. Muestra la estructura de la tabla outbox, la transacción atómica de guardado y el worker poller en background con SELECT FOR UPDATE SKIP LOCKED que evita duplicados.'
  }
];

function tokenize(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ content: text });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8081,
      path: '/tokenize',
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.tokens ? parsed.tokens.length : 0);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function runGeneration(systemPrompt, userPrompt, maxTokens = 650) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
      stream: true,
      stream_options: { include_usage: true }
    });

    const start = performance.now();
    let ttft = null;
    let fullText = '';
    let usage = null;
    let timings = null;

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8081,
      path: '/v1/chat/completions',
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let buffer = '';
      res.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (ttft === null && parsed.choices?.[0]?.delta?.content) {
              ttft = Math.round(performance.now() - start);
            }
            if (parsed.choices?.[0]?.delta?.content) {
              fullText += parsed.choices[0].delta.content;
            }
            if (parsed.usage) usage = parsed.usage;
            if (parsed.timings) timings = parsed.timings;
          } catch (e) {}
        }
      });

      res.on('end', async () => {
        const totalDuration = (performance.now() - start) / 1000;
        const decodeDuration = ttft !== null ? (totalDuration - (ttft / 1000)) : totalDuration;
        
        let realTokens = 0;
        try {
          realTokens = await tokenize(fullText);
        } catch (e) {
          realTokens = usage?.completion_tokens || 0;
        }

        const decodeTokS = timings?.predicted_per_second 
          ? Number(timings.predicted_per_second.toFixed(2))
          : Number((realTokens / (decodeDuration || 1)).toFixed(2));

        resolve({
          fullText,
          ttft,
          totalDuration: Number(totalDuration.toFixed(2)),
          decodeDuration: Number(decodeDuration.toFixed(2)),
          tokens: realTokens,
          tokPerSec: decodeTokS,
          timings,
          usage
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('=== EVALUACIÓN MODELO 3B (DOLPHIN 3B Q4_K_M) ===');
  const results = {
    model: 'dolphin-2.9.4-llama3.2-3b-q4_k_m.gguf',
    decode_baseline_runs: [],
    prompts_standard: [],
    prompts_concise: []
  };

  // 1. Decode baseline (3 repeticiones con prompt estándar de generación)
  console.log('\n--- 1. Decode Baseline 3B (3 repeticiones) ---');
  const decodeBenchmarkPrompt = 'Genera una implementación completa de un algoritmo de búsqueda binaria en Python con comentarios detallados y casos de prueba doctest.';
  for (let i = 1; i <= 3; i++) {
    process.stdout.write(`Repetición ${i}/3... `);
    const res = await runGeneration(BASE_SYSTEM_PROMPT, decodeBenchmarkPrompt, 350);
    console.log(`Tokens: ${res.tokens}, Decode: ${res.tokPerSec} tok/s, TTFT: ${res.ttft}ms`);
    results.decode_baseline_runs.push({
      run: i,
      tokens: res.tokens,
      tokPerSec: res.tokPerSec,
      ttft: res.ttft,
      duration: res.totalDuration
    });
    await new Promise(r => setTimeout(r, 2000));
  }

  // 2. Ejecución de los 8 prompts con System Prompt Estándar
  console.log('\n--- 2. Ejecución de 8 prompts de código (System Prompt Estándar) ---');
  for (const item of PROMPTS) {
    process.stdout.write(`[${item.id}/8] ${item.title}... `);
    const res = await runGeneration(BASE_SYSTEM_PROMPT, item.prompt, 650);
    console.log(`Completado: ${res.tokens} tokens @ ${res.tokPerSec} tok/s (TTFT: ${res.ttft}ms)`);
    results.prompts_standard.push({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      response: res.fullText,
      tokens: res.tokens,
      tokPerSec: res.tokPerSec,
      ttft: res.ttft
    });
    fs.writeFileSync('Simple_Domain/tests/results_3b_partial.json', JSON.stringify(results, null, 2));
    await new Promise(r => setTimeout(r, 2000));
  }

  // 3. Ejecución de los 8 prompts con System Prompt Conciso (para medir ahorro de tokens Punto 6b)
  console.log('\n--- 3. Ejecución de 8 prompts de código (System Prompt Conciso) ---');
  for (const item of PROMPTS) {
    process.stdout.write(`[${item.id}/8 conciso] ${item.title}... `);
    const res = await runGeneration(CONCISE_SYSTEM_PROMPT, item.prompt, 650);
    console.log(`Completado: ${res.tokens} tokens @ ${res.tokPerSec} tok/s (TTFT: ${res.ttft}ms)`);
    results.prompts_concise.push({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      response: res.fullText,
      tokens: res.tokens,
      tokPerSec: res.tokPerSec,
      ttft: res.ttft
    });
    fs.writeFileSync('Simple_Domain/tests/results_3b_partial.json', JSON.stringify(results, null, 2));
    await new Promise(r => setTimeout(r, 2000));
  }

  fs.writeFileSync('Simple_Domain/tests/results_3b_final.json', JSON.stringify(results, null, 2));
  console.log('\n[OK] Evaluación 3B finalizada con éxito. Datos guardados en results_3b_final.json');
}

main().catch(console.error);

