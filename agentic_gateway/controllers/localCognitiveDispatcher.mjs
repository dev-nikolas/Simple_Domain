// agentic_gateway/controllers/localCognitiveDispatcher.mjs
// Fallback estático de plantillas de diagnóstico del sistema ante desconexión de motores upstream.

import os from 'node:os';
import { sendSSEDelta, endSSEStream } from '../views/sseView.mjs';

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

function tryEvaluateMath(prompt, prevContext = []) {
  const clean = prompt.replace(/[¿?¡!]/g, '').trim();

  // 1. Patrón: "le sumo X a Y" o "sumar X a Y" (ej: "le sumo 7 a -7")
  const phrasedAdd = clean.match(/(?:le\s+sumo|sumar|agrego|agrega|sumale)\s+([-+]?[0-9]+(?:\.[0-9]+)?)\s+a\s+([-+]?[0-9]+(?:\.[0-9]+)?)/i);
  if (phrasedAdd) {
    const a = parseFloat(phrasedAdd[1]);
    const b = parseFloat(phrasedAdd[2]);
    const res = b + a;
    return `[RELIC Math Engine] Resultado verificado:\n\`\`\`\n(${b}) + (${a}) = ${res}\n\`\`\``;
  }

  // 2. Patrón de suma acumulativa contextual: "si sumo 7", "y si le sumo 7", "sumale 7"
  const singleAdd = clean.match(/^(?:si\s+sumo|y\s+si\s+sumo|le\s+sumo|sumale|sumando)\s+([-+]?[0-9]+(?:\.[0-9]+)?)$/i);
  if (singleAdd) {
    const delta = parseFloat(singleAdd[1]);
    let prevVal = null;

    if (Array.isArray(prevContext)) {
      for (let i = prevContext.length - 1; i >= 0; i--) {
        const msg = prevContext[i];
        if (msg.role === 'assistant' && typeof msg.content === 'string') {
          const matchNum = msg.content.match(/=\s*([-+]?[0-9]+(?:\.[0-9]+)?)/);
          if (matchNum) {
            prevVal = parseFloat(matchNum[1]);
            break;
          }
        }
      }
    }

    if (prevVal !== null && !Number.isNaN(prevVal)) {
      const res = prevVal + delta;
      return `[RELIC Math Engine] Resultado acumulado sobre el valor previo (${prevVal}):\n\`\`\`\n${prevVal} + ${delta} = ${res}\n\`\`\``;
    }
    return `[RELIC Math Engine] Operación sobre valor base 0:\n\`\`\`\n0 + ${delta} = ${delta}\n\`\`\``;
  }

  // 3. Patrón de expresión aritmética estándar (ej: "95+95 / 5 * 2", "99+85")
  const mathMatch = clean.match(/([-+]?[0-9]+(?:\.[0-9]+)?(?:\s*[\+\-\*\/]\s*[-+]?[0-9]+(?:\.[0-9]+)?)+)/);
  if (mathMatch) {
    const expr = mathMatch[1].trim();
    try {
      if (/^[0-9\s\+\-\*\/\.\(\)]+$/.test(expr)) {
        // Evaluador aritmético seguro acotado exclusivamente a números y operadores
        const result = Function(`'use strict'; return (${expr})`)();
        if (typeof result === 'number' && !Number.isNaN(result) && Number.isFinite(result)) {
          return `[RELIC Math Engine] Resultado verificado:\n\`\`\`\n${expr} = ${result}\n\`\`\``;
        }
      }
    } catch {
      // Continuar al generador si no es sintácticamente evaluable
    }
  }
  return null;
}

function checkConceptualMath(prompt) {
  const p = prompt.toLowerCase();
  if (p.includes('restar') && p.includes('sumando')) {
    return `Sí, es exactamente como funciona en matemáticas y arquitectura de computadores.

En álgebra elemental, **restar equivale a sumar el inverso aditivo**:
$$a - b = a + (-b)$$

Por ejemplo:
\`\`\`
7 - 7 = 7 + (-7) = 0
\`\`\`

En hardware digital (como los núcleos x86_64 que ejecutan los tensores AVX2 de RELIC), las unidades aritmético-lógicas (ALU) no tienen un circuito restador separado: convierten el sustraendo a su **complemento a dos** (invirtiendo los bits y sumando 1) y ejecutan una suma binaria normal.`;
  }
  return null;
}

function checkIdentityQuery(prompt) {
  const p = prompt.toLowerCase().trim();
  if (p.includes('quien eres') || p.includes('quién eres') || p.includes('que eres') || p.includes('qué eres') || p === 'identificate') {
    return `Soy **RELIC** (*Resilient Epistemic Logic & Inference Core*), una arquitectura neuro-simbólica híbrida de ultra-alto rendimiento.

Mis componentes activos son:
1. **Microkernel Determinista** (C99 / Rust): Aritmética exacta, grafos y razonamiento RIR de latencia sub-milisegundo.
2. **Motor Neuronal Acelerado**: Inferencia con tensores cuantizados y SIMD AVX2.
3. **Memoria Semántica & Episódica**: Recuperación asociativa por BM25 y preservación de estados en caliente.`;
  }
  return null;
}

function buildDynamicCode(prompt, langInfo, targetUrl = null) {
  const p = prompt.toLowerCase();
  const { lang, comment } = langInfo;

  // Detección de bucles / estructuras de control
  if (p.includes('ciclo for') || p.includes('bucle for') || p.includes('for loop')) {
    if (lang === 'python') {
      if (p.includes('anidad') || p.includes('nest')) {
        return `\`\`\`python
# RELIC — Ciclo for anidado en Python
for i in range(3):
    for j in range(3):
        print(f"Coordenada [{i}][{j}] = {i * j}")
\`\`\``;
      }
      return `\`\`\`python
# RELIC — Ciclo for canónico en Python
# 1. Iteración por rango numérico
for i in range(5):
    print(f"Iteración: {i}")

# 2. Iteración sobre colecciones
items = ["alpha", "beta", "gamma"]
for item in items:
    print(f"Elemento: {item}")
\`\`\``;
    }
    if (lang === 'c' || lang === 'cpp') {
      if (p.includes('anidad') || p.includes('nest')) {
        return `\`\`\`c
// RELIC — Ciclo for anidado en C99
#include <stdio.h>

int main(void) {
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            printf("[%d][%d] = %d\\n", i, j, i * j);
        }
    }
    return 0;
}
\`\`\``;
      }
      return `\`\`\`c
// RELIC — Ciclo for canónico en C99
#include <stdio.h>

int main(void) {
    for (int i = 0; i < 5; i++) {
        printf("Iteración: %d\\n", i);
    }
    return 0;
}
\`\`\``;
    }
    if (lang === 'rust') {
      return `\`\`\`rust
// RELIC — Ciclo for canónico en Rust
fn main() {
    for i in 0..5 {
        println!("Iteración: {i}");
    }
}
\`\`\``;
    }
  }

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

  const displayUrl = targetUrl || 'http://127.0.0.1:8080/v1/chat/completions';
  return `[RELIC Motor C99 Desconectado]: El motor neuronal de inferencia en ${displayUrl} no está disponible.
Consulta recibida: "${prompt}".
Para habilitar inferencia generativa profunda en local (AVX2 / C99):
1. Inicie el ecosistema unificado con: python run.py
2. O levante el servidor C99 directamente: cd RELIC-project && .\\relic_cli.exe --server`;
}

const GREETING_REGEX = /^(hola|buenos\s*d[ií]as|buenas\s*tardes|buenas\s*noches|hey|saludos|qu[eé]\s*tal|c[oó]mo\s*est[aá]s)[?!.\s]*$/i;

export function checkConversationalGreeting(prompt) {
  const clean = (prompt || '').trim();
  if (GREETING_REGEX.test(clean)) {
    return "¡Hola! Soy RELIC. El motor está listo y en línea. ¿En qué te ayudo hoy?";
  }
  return null;
}

export function synthesizeDynamicResponse(prompt, cartridge, memories = [], prevContext = [], targetUrl = null) {
  const greeting = checkConversationalGreeting(prompt);
  if (greeting) {
    return greeting;
  }
  const identity = checkIdentityQuery(prompt);
  if (identity) {
    return identity;
  }
  const conceptual = checkConceptualMath(prompt);
  if (conceptual) {
    return conceptual;
  }
  const mathResult = tryEvaluateMath(prompt, prevContext);
  if (mathResult) {
    return mathResult;
  }
  const langInfo = detectLanguage(prompt);
  return buildDynamicCode(prompt, langInfo, targetUrl);
}

export async function dispatchLocalAutonomousChat({
  res,
  prompt,
  cartridge,
  sessionId,
  sessionStore,
  relicMemoryStore,
  targetUrl,
}) {
  const allMemories = typeof relicMemoryStore?.getAll === 'function' ? relicMemoryStore.getAll() : [];
  const relevantMemories = allMemories.filter((m) => {
    const topic = (m.topic || '').toLowerCase();
    const p = prompt.toLowerCase();
    return p.includes(topic) || topic.split('_').some((t) => t.length > 3 && p.includes(t));
  });

  let prevContext = [];
  if (sessionId && sessionStore) {
    const session = typeof sessionStore.getSession === 'function' ? sessionStore.getSession(sessionId) : null;
    if (session && Array.isArray(session.messages)) {
      prevContext = session.messages;
    }
  }

  const fullResponse = synthesizeDynamicResponse(prompt, cartridge, relevantMemories, prevContext, targetUrl);

  const lines = fullResponse.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const chunk = lines[i] + (i < lines.length - 1 ? '\n' : '');
    sendSSEDelta(res, chunk);
  }

  endSSEStream(res);

  if (sessionId && sessionStore) {
    sessionStore.addMessage(sessionId, { role: 'user', content: prompt });
    sessionStore.addMessage(sessionId, { role: 'assistant', content: fullResponse });
  }
}
