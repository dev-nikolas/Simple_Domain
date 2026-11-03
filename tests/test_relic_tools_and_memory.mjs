import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:4000';

async function testFsModify() {
  console.log('\n--- 1. Probando relic_fs_modify ---');
  // 1a. Crear / escribir archivo en cuarentena
  const writeRes = await fetch(`${BASE_URL}/v1/tools/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'relic_fs_modify',
      arguments: {
        path: 'quarantine/sample_malware_analysis.py',
        action: 'write',
        content: '# Script desofuscado por RELIC\ndef decode_xor(data, key=0x5A):\n    return bytes([b ^ key for b in data])\n'
      }
    })
  });
  const writeData = await writeRes.json();
  console.log('relic_fs_modify (write):', writeData);
  assert.strictEqual(writeData.isError, false, 'Write file failed');

  // 1b. Leer archivo
  const readRes = await fetch(`${BASE_URL}/v1/tools/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'relic_fs_modify',
      arguments: {
        path: 'quarantine/sample_malware_analysis.py',
        action: 'read'
      }
    })
  });
  const readData = await readRes.json();
  console.log('relic_fs_modify (read):', readData.content[0].text.trim());
  assert(readData.content[0].text.includes('decode_xor'), 'Read content mismatch');

  // 1c. Listar directorio cuarentena
  const listRes = await fetch(`${BASE_URL}/v1/tools/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'relic_fs_modify',
      arguments: {
        path: 'quarantine',
        action: 'list'
      }
    })
  });
  const listData = await listRes.json();
  console.log('relic_fs_modify (list):', listData.entries);
  assert(listData.entries.some(e => e.name === 'sample_malware_analysis.py'), 'File not in list');
}

async function testWebSearch() {
  console.log('\n--- 2. Probando relic_web_search ---');
  const searchRes = await fetch(`${BASE_URL}/v1/tools/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'relic_web_search',
      arguments: {
        query: 'CVE-2024 linux epoll'
      }
    })
  });
  const searchData = await searchRes.json();
  console.log('relic_web_search status:', searchData.isError ? 'ERROR' : 'OK');
  console.log('Resultados encontrados:', searchData.results?.length || 0);
  if (searchData.results?.length > 0) {
    console.log('Primer resultado:', searchData.results[0].title);
    console.log('URL:', searchData.results[0].url);
  }
  assert.strictEqual(searchData.isError, false, 'Web search failed');
}

async function testMemorize() {
  console.log('\n--- 3. Probando relic_memorize ---');
  const memRes = await fetch(`${BASE_URL}/v1/tools/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'relic_memorize',
      arguments: {
        topic: 'Rutina de desofuscación payload XOR',
        conclusion: 'El dropper usa clave XOR estática 0x5A sobre el segmento .text con desplazamiento de 4 bytes.'
      }
    })
  });
  const memData = await memRes.json();
  console.log('relic_memorize response:', memData.content[0].text);
  assert.strictEqual(memData.isError, false, 'Memorize tool failed');

  // Verificar en API de memoria
  const listMemRes = await fetch(`${BASE_URL}/v1/relic/memory`);
  const listMem = await listMemRes.json();
  console.log('Total conclusiones en memoria:', listMem.length);
  const found = listMem.find(m => m.topic.includes('desofuscación payload XOR'));
  assert(found, 'Conclusion was not stored in memory store');
  console.log('Conclusión recuperada:', found);
}

async function testChatSystemPromptWithMemory() {
  console.log('\n--- 4. Probando inyección de personalidad RELIC y memoria en chat stream ---');
  const chatRes = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: '¿Quién eres y qué descubrimientos tienes en tu memoria?' }
      ],
      max_tokens: 150,
      stream: true
    })
  });

  const reader = chatRes.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.choices?.[0]?.delta?.content) {
            fullResponse += parsed.choices[0].delta.content;
          }
        } catch {}
      }
    }
  }

  console.log('\nRespuesta generada por RELIC:');
  console.log(fullResponse.trim());
  assert(fullResponse.length > 0, 'No output received from RELIC chat');
}

async function main() {
  await testFsModify();
  await testWebSearch();
  await testMemorize();
  await testChatSystemPromptWithMemory();
  console.log('\n========================================');
  console.log('TODAS LAS PRUEBAS DE RELIC PASARON (OK)');
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Error en pruebas:', err);
  process.exit(1);
});

