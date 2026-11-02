import http from 'http';

function requestStream(options, payload) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let ttft = null;
    let tokenCount = 0;
    let fullText = '';
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
                fullText += content;
              }
            } catch {}
          }
        }
      });

      res.on('end', () => {
        const totalDuration = (performance.now() - start) / 1000;
        const decodeDuration = (performance.now() - firstTokenTime) / 1000;
        const decodeSpeed = decodeDuration > 0 && tokenCount > 0 
          ? (tokenCount / decodeDuration).toFixed(2) 
          : '0.00';

        resolve({
          ttft,
          tokenCount,
          totalDuration: Number(totalDuration.toFixed(2)),
          decodeSpeed: Number(decodeSpeed),
          fullText
        });
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

const SYSTEM_PROMPT = "Eres un asistente de programacion conciso y altamente tecnico.";

// Prompt largo para Conversación A (~400 tokens)
const CONVERSATION_A_MSG1 = "Explica detalladamente la diferencia conceptual y practica entre la memoria Stack y Heap en el lenguaje Rust, enfatizando el ownership, RAII y Drop trait.";

// Prompt largo para Conversación B (~400 tokens)
const CONVERSATION_B_MSG1 = "Describe el funcionamiento interno del protocolo Raft para consenso distribuido, explicando Leader Election, Log Replication y Safety invariants.";

async function runSessionSwitchTest() {
  console.log('=== TEST MULTI-SESION: CONVERSACION A -> B -> A ===');
  console.log('Objetivo: Medir si el KV cache retiene la sesion A o si se destruye con -np 1.\n');

  // Turno A1 (Cold)
  console.log('[Paso 1] Conversación A - Turno 1 (Prompt técnico sobre Rust)...');
  const resA1 = await requestStream(
    { hostname: '127.0.0.1', port: 4000, path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: CONVERSATION_A_MSG1 }
      ],
      max_tokens: 60
    }
  );
  console.log(`  -> Turno A1 completado: TTFT = ${resA1.ttft} ms | Decode = ${resA1.decodeSpeed} t/s | Tokens = ${resA1.tokenCount}`);

  // Pausa corta
  await new Promise(r => setTimeout(r, 2000));

  // Turno B1 (Cold / Cambio de contexto)
  console.log('\n[Paso 2] Conversación B - Turno 1 (Prompt técnico sobre Raft - Cambio de contexto)...');
  const resB1 = await requestStream(
    { hostname: '127.0.0.1', port: 4000, path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: CONVERSATION_B_MSG1 }
      ],
      max_tokens: 60
    }
  );
  console.log(`  -> Turno B1 completado: TTFT = ${resB1.ttft} ms | Decode = ${resB1.decodeSpeed} t/s | Tokens = ${resB1.tokenCount}`);

  // Pausa corta
  await new Promise(r => setTimeout(r, 2000));

  // Turno A2 (Volviendo a Conversación A)
  console.log('\n[Paso 3] Conversación A - Turno 2 (Retorno a conversación A con historial)...');
  const resA2 = await requestStream(
    { hostname: '127.0.0.1', port: 4000, path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: CONVERSATION_A_MSG1 },
        { role: 'assistant', content: resA1.fullText },
        { role: 'user', content: '¿Como se relaciona esto con el smart pointer Box<T>?' }
      ],
      max_tokens: 60
    }
  );
  console.log(`  -> Turno A2 completado: TTFT = ${resA2.ttft} ms | Decode = ${resA2.decodeSpeed} t/s | Tokens = ${resA2.tokenCount}`);

  console.log('\n=== RESULTADOS DEL CAMBIO DE SESIÓN CON -np 1 ===');
  console.log(`Turno A1 (Frío): TTFT = ${resA1.ttft} ms`);
  console.log(`Turno B1 (Intercalado): TTFT = ${resB1.ttft} ms`);
  console.log(`Turno A2 (Regreso a A): TTFT = ${resA2.ttft} ms`);
  if (resA2.ttft > 5000) {
    console.log('DIAGNÓSTICO: El KV cache de A se PERDIÓ al procesar B. Se tuvo que recomputar todo el historial de A.');
  } else {
    console.log('DIAGNÓSTICO: El KV cache de A se CONSERVÓ (TTFT sub-segundo).');
  }
}

runSessionSwitchTest().catch(console.error);

