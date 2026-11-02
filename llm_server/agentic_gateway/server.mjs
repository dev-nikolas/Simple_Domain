// agentic_gateway/server.mjs
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { RelicMcpClient } from './mcpClient.mjs';

const PORT = process.env.PORT || 4000;
const LLAMA_URL = process.env.LLAMA_URL || 'http://127.0.0.1:8081/v1/chat/completions';

const mcpClient = new RelicMcpClient();

// Herramienta nativa para inspección de código local
const LOCAL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_code_file',
      description: 'Lee el contenido de un archivo de código fuente local en el proyecto.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta relativa o absoluta del archivo a leer',
          },
        },
        required: ['path'],
      },
    },
  },
];

async function executeTool(name, args) {
  if (name === 'read_code_file') {
    try {
      const filePath = path.resolve(args.path);
      const content = await fs.readFile(filePath, 'utf-8');
      return { content: [{ type: 'text', text: content }], isError: false };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error leyendo archivo: ${e.message}` }], isError: true };
    }
  }

  // Delegar a microkernel RELIC MCP
  return await mcpClient.callTool(name, args);
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function startServer() {
  await mcpClient.start();

  const allTools = [...LOCAL_TOOLS, ...mcpClient.getOpenAiToolsSchema()];

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mcp: mcpClient.isInitialized, toolsCount: allTools.length }));
      return;
    }

    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const clientPayload = JSON.parse(body);
          const messages = [...(clientPayload.messages || [])];
          
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          const sendSSEDelta = (text) => {
            const chunk = {
              choices: [{ delta: { content: text }, finish_reason: null }],
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          };

          // Ejecución del bucle agéntico (máx 2 llamadas consecutivas para proteger CPU)
          let currentMessages = [...messages];
          let continueLoop = true;
          let turn = 0;

          while (continueLoop && turn < 2) {
            turn++;

            // Consultar a llama-server (usamos llamadas directas para capturar tool_calls estructurados)
            const llamaRes = await fetch(LLAMA_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: currentMessages,
                tools: allTools,
                temperature: 0.1,
                max_tokens: 300,
              }),
            });

            if (!llamaRes.ok) {
              const err = await llamaRes.text();
              sendSSEDelta(`\n[Error de inferencia en llama-server: ${err}]`);
              break;
            }

            const llamaJson = await llamaRes.json();
            const choice = llamaJson.choices?.[0];
            const msg = choice?.message;

            if (!msg) {
              break;
            }

            // Caso 1: El modelo generó llamadas a herramientas estructuradas (tool_calls)
            if (msg.tool_calls && msg.tool_calls.length > 0) {
              currentMessages.push(msg);

              for (const tc of msg.tool_calls) {
                const toolName = tc.function.name;
                let toolArgs = {};
                try {
                  toolArgs = typeof tc.function.arguments === 'string' 
                    ? JSON.parse(tc.function.arguments) 
                    : tc.function.arguments;
                } catch {
                  toolArgs = {};
                }

                sendSSEDelta(`\n\n⚙️ *[RELIC MCP] Invocando \`${toolName}\`...*\n\n`);
                console.log(`[Agentic Gateway] Ejecutando herramienta ${toolName}:`, toolArgs);

                const toolResult = await executeTool(toolName, toolArgs);
                const resultText = toolResult?.content?.[0]?.text || JSON.stringify(toolResult);

                sendSSEDelta(`\`\`\`json\n${resultText}\n\`\`\`\n\n`);

                currentMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id || `call_${Date.now()}`,
                  name: toolName,
                  content: resultText,
                });
              }

              // Continuamos el bucle para que el modelo interprete el resultado del tool
              continue;
            }

            // Caso 2: El modelo emitió respuesta textual final
            if (msg.content) {
              sendSSEDelta(msg.content);
            }

            continueLoop = false;
          }

          res.write('data: [DONE]\n\n');
          res.end();
        } catch (err) {
          console.error('[Gateway] Error procesando completions:', err);
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Agentic Gateway] En línea en http://127.0.0.1:${PORT}`);
    console.log(`[Agentic Gateway] Enrutando inferencia hacia llama-server (:8081) y microkernel RELIC.`);
  });
}

startServer().catch((e) => {
  console.error('[Agentic Gateway] Error fatal:', e);
  process.exit(1);
});
