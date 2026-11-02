import http from 'http';

async function testToolsRegression() {
  console.log('--- TEST REGRESIÓN: HERRAMIENTAS ACTIVADAS (enable_tools: true) ---');
  
  const payload = JSON.stringify({
    messages: [
      { role: 'system', content: 'You are an agent with access to functions. Call read_code_file to read package.json.' },
      { role: 'user', content: 'Please read package.json using your read_code_file tool.' }
    ],
    max_tokens: 150,
    enable_tools: true
  });

  const options = {
    hostname: '127.0.0.1',
    port: 4000,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let fullResponse = '';
    res.on('data', (chunk) => {
      fullResponse += chunk.toString();
    });

    res.on('end', () => {
      console.log('Status code:', res.statusCode);
      console.log('Sample output (first 400 chars):');
      console.log(fullResponse.substring(0, 400));
      console.log('Done!');
    });
  });

  req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });

  req.write(payload);
  req.end();
}

testToolsRegression();
