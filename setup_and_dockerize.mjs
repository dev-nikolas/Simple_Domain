// Simple_Domain/setup_and_dockerize.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_DIR = path.resolve(__dirname, 'llm_server');
const MODEL_NAME = 'dolphin-2.9.4-llama3.2-3b-q4_k_m.gguf';
const MODEL_PATH = path.join(MODEL_DIR, MODEL_NAME);
const MODEL_URL = 'https://huggingface.co/bartowski/Dolphin3.0-Llama3.2-3B-GGUF/resolve/main/Dolphin3.0-Llama3.2-3B-Q4_K_M.gguf';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function downloadFileWithRedirects(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Manejo de redirecciones HTTP 301 / 302 / 307 (común en Hugging Face CDN)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFileWithRedirects(res.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Error HTTP ${res.statusCode} al descargar el modelo`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let lastReport = 0;

      const fileStream = fs.createWriteStream(destPath);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        if (now - lastReport > 500) { // Actualizar cada 500ms
          lastReport = now;
          const percent = totalBytes > 0 ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '?';
          process.stdout.write(`\r[Descarga] ${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)} (${percent}%)   `);
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        process.stdout.write('\n');
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32' ? 'cmd.exe' : false,
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Comando '${command}' finalizó con código ${code}`));
    });

    proc.on('error', reject);
  });
}

async function main() {
  console.log('============================================================');
  console.log('  SIMPLE DOMAIN — Autoprovisionamiento y Dockerización');
  console.log('============================================================');

  // 1. Asegurar directorio llm_server
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }

  // 2. Comprobar / Descargar el modelo
  if (fs.existsSync(MODEL_PATH) && fs.statSync(MODEL_PATH).size > 1000000) {
    const size = fs.statSync(MODEL_PATH).size;
    console.log(`[OK] Modelo ya presente en: ${MODEL_PATH} (${formatBytes(size)})`);
  } else {
    console.log(`[INIT] Modelo no encontrado. Descargando Dolphin 3B Q4_K_M (~2.02 GB)...`);
    console.log(`[URL]  ${MODEL_URL}`);
    try {
      await downloadFileWithRedirects(MODEL_URL, MODEL_PATH);
      console.log(`[OK] Descarga finalizada exitosamente.`);
    } catch (err) {
      console.error(`[ERROR] Falló la descarga del modelo:`, err.message);
      process.exit(1);
    }
  }

  // 3. Ejecutar Docker Compose para construir y levantar el stack
  console.log('\n[DOCKER] Construyendo y levantando contenedores con Docker Compose...');
  try {
    await runCommand('docker', ['compose', 'up', '--build', '-d'], __dirname);
    console.log('\n============================================================');
    console.log('  [STACK OPERATIVO] Todos los servicios han sido dockerizados:');
    console.log('  * Frontend Web:       http://localhost:5173');
    console.log('  * Agentic Gateway:    http://localhost:4000');
    console.log('  * Microkernel RELIC:  http://localhost:5000');
    console.log('  * Motor LLM (8081):   http://localhost:8081');
    console.log('============================================================\n');
  } catch (err) {
    console.warn(`\n[AVISO DOCKER] ${err.message}`);
    console.warn(`Verifica que Docker Desktop se encuentre iniciado y en ejecución.`);
  }
}

main().catch(console.error);
