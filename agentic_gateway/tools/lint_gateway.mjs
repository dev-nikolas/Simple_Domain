#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EMPTY_CATCH_REGEX = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;

let violations = 0;
let filesScanned = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.mjs') || entry.name.endsWith('.js')) {
      filesScanned++;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      let match;
      while ((match = EMPTY_CATCH_REGEX.exec(content)) !== null) {
        const offset = match.index;
        const lineNum = content.substring(0, offset).split('\n').length;
        console.error(`[LINTER ERROR] ${path.relative(rootDir, fullPath)}:${lineNum}`);
        console.error(`    Violacion: Bloque catch vacio detectado (Error Swallowing prohibido).`);
        violations++;
      }
    }
  }
}

console.log('[CHECK] Escaneando codigo de Gateway contra Error Swallowing (ESLint no-empty)...');
scanDir(rootDir);

if (violations > 0) {
  console.error(`\n[FAIL] Se encontraron ${violations} bloques catch vacios. El build de CI/CD se detiene.`);
  process.exit(1);
}

console.log(`[OK] Verificados ${filesScanned} archivos. Cero bloques catch vacios.`);
process.exit(0);

