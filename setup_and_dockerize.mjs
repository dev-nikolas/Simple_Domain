// Simple_Domain/setup_and_dockerize.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log('  SIMPLE DOMAIN — Orquestación y Despliegue en Docker');
  console.log('============================================================');
  console.log('  * Los pesos del modelo residen en el volumen Docker (simple_domain_models).');
  console.log('  * Cero archivos pesados en el espacio de trabajo del usuario.');
  console.log('  * Compilación y enlace automático de los 4 servicios.');
  console.log('============================================================\n');

  try {
    await runCommand('docker', ['compose', 'up', '--build', '-d'], __dirname);
    console.log('\n============================================================');
    console.log('  [STACK OPERATIVO] Todos los servicios han sido dockerizados:');
    console.log('  * Frontend Web:       http://localhost:5173');
    console.log('  * Agentic Gateway:    http://localhost:4000');
    console.log('  * Microkernel RELIC:  http://localhost:5000');
    console.log('  * Motor RELIC AI (8080): http://localhost:8080');
    console.log('============================================================\n');
  } catch (err) {
    console.error(`\n[ERROR DOCKER] ${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
