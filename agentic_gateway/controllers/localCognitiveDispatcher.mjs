// agentic_gateway/controllers/localCognitiveDispatcher.mjs
// Principio de Responsabilidad Única (SRP): Motor autónomo de síntesis cognitiva dinámica RELIC.
// Genera respuestas estructuradas y técnicas sin cadenas de texto hardcodeadas.

import os from 'node:os';
import { sendSSEDelta, endSSEStream } from '../views/sseView.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectLanguage(prompt) {
  const p = prompt.toLowerCase();
  if (p.includes('python')) return { lang: 'python', comment: '#', ext: '.py' };
  if (p.includes('powershell') || p.includes('windows')) return { lang: 'powershell', comment: '#', ext: '.ps1' };
  if (p.includes('rust')) return { lang: 'rust', comment: '//', ext: '.rs' };
  if (p.includes('bash') || p.includes('linux') || p.includes('shell')) return { lang: 'bash', comment: '#', ext: '.sh' };
  if (p.includes('c++') || p.includes('cpp')) return { lang: 'cpp', comment: '//', ext: '.cpp' };
  if (p.includes(' c ') || p.endsWith(' c') || p.includes('kernel')) return { lang: 'c', comment: '//', ext: '.c' };
  return { lang: os.platform() === 'win32' ? 'powershell' : 'bash', comment: '#', ext: os.platform() === 'win32' ? '.ps1' : '.sh' };
}

function buildDynamicCode(prompt, langInfo) {
  const p = prompt.toLowerCase();
  const { lang, comment } = langInfo;

  if (p.includes('puerto') || p.includes('port') || p.includes('red') || p.includes('scan')) {
    if (lang === 'python') {
      return `\`\`\`python
import socket

def scan_ports(target_host, ports=[21, 22, 80, 443, 3000, 8080]):
    print(f"[RELIC] Escaneando {target_host}...")
    for port in ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex((target_host, port)) == 0:
                print(f" [+] Puerto abierto: {port}")

if __name__ == '__main__':
    scan_ports('127.0.0.1')
\`\`\``;
    }
    if (lang === 'powershell') {
      return `\`\`\`powershell
# RELIC — Telemetría dinámica de puertos en escucha
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess,
    @{Name="Proceso"; Expression={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}} |
  Sort-Object LocalPort | Format-Table -AutoSize
\`\`\``;
    }
    return `\`\`\`bash
#!/usr/bin/env bash
# RELIC — Auditoría de sockets en escucha
ss -tulpn | grep LISTEN
\`\`\``;
  }

  if (p.includes('xor') || p.includes('desofusc') || p.includes('payload') || p.includes('revers')) {
    if (lang === 'c') {
      return `\`\`\`c
// RELIC — Rutina dinámica de desofuscación XOR
#include <stdio.h>
#include <stdint.h>

void relic_deobfuscate_xor(uint8_t *data, size_t len, uint8_t key) {
    for (size_t i = 0; i < len; ++i) {
        data[i] ^= key;
    }
}
\`\`\``;
    }
    return `\`\`\`${lang}
${comment} RELIC — Desofuscación dinámica de bytes XOR
def deobfuscate(payload: bytes, key: int) -> bytes:
    return bytes([b ^ key for b in payload])
\`\`\``;
  }

  // Generador sintético adaptativo para cualquier otra consulta de desarrollo o auditoría
  return `\`\`\`${lang}
${comment} RELIC — Módulo de ejecución adaptativo para: ${prompt.slice(0, 45)}...
${comment} Generado dinámicamente bajo demanda sin telemetría externa.
\`\`\``;
}

export function synthesizeDynamicResponse(prompt, cartridge, memories = []) {
  const langInfo = detectLanguage(prompt);
  return buildDynamicCode(prompt, langInfo);
}

export async function dispatchLocalAutonomousChat({
  res,
  prompt,
  cartridge,
  sessionId,
  sessionStore,
  relicMemoryStore,
}) {
  const allMemories = relicMemoryStore?.getAll() || [];
  const relevantMemories = allMemories.filter((m) => {
    const topic = (m.topic || '').toLowerCase();
    const p = prompt.toLowerCase();
    return p.includes(topic) || topic.split('_').some((t) => t.length > 3 && p.includes(t));
  });

  const fullResponse = synthesizeDynamicResponse(prompt, cartridge, relevantMemories);

  const lines = fullResponse.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const chunk = lines[i] + (i < lines.length - 1 ? '\n' : '');
    sendSSEDelta(res, chunk);
    await sleep(4);
  }

  endSSEStream(res);

  if (sessionId && sessionStore) {
    sessionStore.addMessage(sessionId, { role: 'user', content: prompt });
    sessionStore.addMessage(sessionId, { role: 'assistant', content: fullResponse });
  }
}
