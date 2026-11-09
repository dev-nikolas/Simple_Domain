import fs from 'fs';
import { execSync } from 'child_process';
import http from 'http';
import { runSizeSuite } from './benchmark_rigorous_validation.mjs';

function setDockerCompose(tb, cpus) {
  let content = fs.readFileSync('docker-compose.yml', 'utf8');

  if (content.includes('-tb 4')) {
    content = content.replace('-tb 4', `-tb ${tb}`);
  } else if (content.includes('-tb 2')) {
    content = content.replace('-tb 2', `-tb ${tb}`);
  } else {
    content = content.replace('--flash-attn off', `--flash-attn off\n      -tb ${tb}`);
  }

  content = content.replace(/cpus: "[0-9.]+"/, `cpus: "${cpus}"`);

  fs.writeFileSync('docker-compose.yml', content, 'utf8');
  console.log(`[Config] Establecido: -tb ${tb} | cpus: "${cpus}"`);
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8081/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function restartLlmEngine() {
  console.log('[Docker] Reiniciando sd_llm_engine...');
  execSync('docker compose up -d llm_engine', { stdio: 'inherit' });

  console.log('[Docker] Esperando a que llama-server esté listo...');
  for (let i = 0; i < 40; i++) {
    const isOk = await checkHealth();
    if (isOk) {
      console.log('[Docker] sd_llm_engine listo y saludable.');
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Timeout esperando a sd_llm_engine');
}

async function main() {
  const configs = [
    { label: '1. Base Conservador (-tb 2, cpus 2.0)', tb: 2, cpus: '2.0' },
    { label: '2. Solo cpus 4.0 (-tb 2, cpus 4.0)', tb: 2, cpus: '4.0' },
    { label: '3. Solo -tb 4 (-tb 4, cpus 2.0)', tb: 4, cpus: '2.0' },
    { label: '4. Ambos (-tb 4, cpus 4.0)', tb: 4, cpus: '4.0' },
  ];

  // Tamaños evaluados: 370, 1000, 3000 tokens con 5 repeticiones en frío puro
  const sizes = [370, 1000, 3000];
  const reps = 5;

  const fullReport = {};

  for (const cfg of configs) {
    console.log(`\n========================================================================`);
    console.log(`INICIANDO CONFIGURACIÓN: ${cfg.label}`);
    console.log(`========================================================================`);

    setDockerCompose(cfg.tb, cfg.cpus);
    await restartLlmEngine();

    await new Promise(r => setTimeout(r, 4000));

    const result = await runSizeSuite(cfg.label, sizes, reps);
    fullReport[cfg.label] = result;

    fs.writeFileSync('benchmark_matrix_report.json', JSON.stringify(fullReport, null, 2), 'utf8');
  }

  console.log('\n========================================================================');
  console.log('MATRIZ DE VALIDACIÓN COMPLETADA CON ÉXITO:');
  console.log(JSON.stringify(fullReport, null, 2));
}

main().catch(console.error);
