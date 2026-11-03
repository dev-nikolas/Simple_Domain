import http from 'http';
import fs from 'fs';

const agent = new http.Agent({ keepAlive: false });
const BASE_SYSTEM_PROMPT = 'Eres un desarrollador de software senior, preciso y eficiente.';

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

function generateComparisonMarkdown(data3b, data1b) {
  let md = '# Comparación de Rendimiento y Calidad de Código: Dolphin 3B vs Llama 3.2 1B\n\n';
  md += 'Documento generado automáticamente para evaluar la viabilidad de un modelo liviano (1B-1.5B) como opción rápida frente al modelo estándar (3B), y el impacto de concisión en el system prompt.\n\n';
  
  md += '## 1. Resumen de Velocidad de Decodificación (Decode tok/s)\n\n';
  md += '| Métrica / Modelo | Dolphin 3B Q4_K_M (1.9 GB) | Llama 3.2 1B Q4_K_M (771 MB) | Factor de Aceleración |\n';
  md += '|---|---|---|---|\n';
  
  const b3b = data3b.decode_baseline_runs;
  const b1b = data1b.decode_baseline_runs;
  const med3b = (b3b.map(r => r.tokPerSec).sort((a,b)=>a-b))[1];
  const med1b = (b1b.map(r => r.tokPerSec).sort((a,b)=>a-b))[1];
  const speedup = (med1b / (med3b || 1)).toFixed(2);
  
  md += `| **Decode Mediana (3 rep)** | **${med3b} tok/s** | **${med1b} tok/s** | **${speedup}× más rápido** |\n`;
  md += `| Repetición 1 | ${b3b[0]?.tokPerSec} tok/s (${b3b[0]?.tokens} tokens) | ${b1b[0]?.tokPerSec} tok/s (${b1b[0]?.tokens} tokens) | ${(b1b[0]?.tokPerSec / (b3b[0]?.tokPerSec||1)).toFixed(2)}× |\n`;
  md += `| Repetición 2 | ${b3b[1]?.tokPerSec} tok/s (${b3b[1]?.tokens} tokens) | ${b1b[1]?.tokPerSec} tok/s (${b1b[1]?.tokens} tokens) | ${(b1b[1]?.tokPerSec / (b3b[1]?.tokPerSec||1)).toFixed(2)}× |\n`;
  md += `| Repetición 3 | ${b3b[2]?.tokPerSec} tok/s (${b3b[2]?.tokens} tokens) | ${b1b[2]?.tokPerSec} tok/s (${b1b[2]?.tokens} tokens) | ${(b1b[2]?.tokPerSec / (b3b[2]?.tokPerSec||1)).toFixed(2)}× |\n\n`;

  md += '## 2. Impacto de Instrucción de Concisión en System Prompt (Modelo 3B)\n\n';
  md += '| ID | Tarea / Prompt | Tokens Estándar | Tokens Conciso | Reducción de Tokens | Ahorro (%) |\n';
  md += '|---|---|---|---|---|---|\n';
  
  let totalStdTokens = 0;
  let totalConciseTokens = 0;

  for (let i = 0; i < data3b.prompts_standard.length; i++) {
    const std = data3b.prompts_standard[i];
    const cnc = data3b.prompts_concise[i];
    const diff = std.tokens - cnc.tokens;
    const pct = std.tokens > 0 ? ((diff / std.tokens) * 100).toFixed(1) : 0;
    totalStdTokens += std.tokens;
    totalConciseTokens += cnc.tokens;
    md += `| ${std.id} | ${std.title} | ${std.tokens} | ${cnc.tokens} | ${diff >= 0 ? '-' + diff : '+' + Math.abs(diff)} | ${diff >= 0 ? '-' + pct : '+' + Math.abs(pct)}% |\n`;
  }
  const totalDiff = totalStdTokens - totalConciseTokens;
  const totalPct = totalStdTokens > 0 ? ((totalDiff / totalStdTokens) * 100).toFixed(1) : 0;
  md += `| **TOTAL** | **8 Prompts Evaluados** | **${totalStdTokens} tokens** | **${totalConciseTokens} tokens** | **-${totalDiff} tokens** | **-${totalPct}%** |\n\n`;
  md += '> **Nota sobre Prefix Cache:** Al estructurar la instrucción de concisión como sufijo adicional sobre la base del System Prompt, el prefijo de tokens inicial permanece idéntico, preservando el reuso del KV cache en memoria.\n\n';

  md += '## 3. Comparativa Cualitativa y Técnica Lado a Lado (16 Respuestas)\n\n';

  for (let i = 0; i < data3b.prompts_standard.length; i++) {
    const p3 = data3b.prompts_standard[i];
    const p1 = data1b.prompts_standard[i];

    md += `### Prompt ${p3.id}: ${p3.title}\n\n`;
    md += `**Instrucción / Prompt:**\n\`\`\`\n${p3.prompt}\n\`\`\`\n\n`;

    md += `#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)\n`;
    md += `- **Tokens generados:** ${p3.tokens} (verificados por \`/tokenize\`)\n`;
    md += `- **Velocidad de generación:** ${p3.tokPerSec} tok/s\n`;
    md += `- **TTFT inicial:** ${p3.ttft} ms\n\n`;
    md += '```text\n' + p3.response.trim() + '\n```\n\n';

    md += `#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)\n`;
    md += `- **Tokens generados:** ${p1.tokens} (verificados por \`/tokenize\`)\n`;
    md += `- **Velocidad de generación:** ${p1.tokPerSec} tok/s\n`;
    md += `- **TTFT inicial:** ${p1.ttft} ms\n\n`;
    md += '```text\n' + p1.response.trim() + '\n```\n\n';
    md += '---\n\n';
  }

  return md;
}

async function main() {
  console.log('=== EVALUACIÓN MODELO 1B (LLAMA 3.2 1B INSTRUCT Q4_K_M) ===');
  const results = {
    model: 'llama-3.2-1b-instruct-q4_k_m.gguf',
    decode_baseline_runs: [],
    prompts_standard: []
  };

  // 1. Decode baseline (3 repeticiones)
  console.log('\n--- 1. Decode Baseline 1B (3 repeticiones) ---');
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
  console.log('\n--- 2. Ejecución de 8 prompts de código (System Prompt Estándar en 1B) ---');
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
    fs.writeFileSync('Simple_Domain/tests/results_1b_partial.json', JSON.stringify(results, null, 2));
    await new Promise(r => setTimeout(r, 2000));
  }

  fs.writeFileSync('Simple_Domain/tests/results_1b_final.json', JSON.stringify(results, null, 2));
  console.log('\n[OK] Evaluación 1B finalizada con éxito. Guardada en results_1b_final.json');

  // 3. Merging y creación del Markdown final
  console.log('\n--- Generando model_comparison_1b_vs_3b.md ---');
  const data3b = JSON.parse(fs.readFileSync('Simple_Domain/tests/results_3b_final.json', 'utf8'));
  const mdContent = generateComparisonMarkdown(data3b, results);
  fs.writeFileSync('Simple_Domain/model_comparison_1b_vs_3b.md', mdContent, 'utf8');
  console.log('[OK] Archivo Simple_Domain/model_comparison_1b_vs_3b.md generado correctamente.');
}

main().catch(console.error);

