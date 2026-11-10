// agentic_gateway/mcpClient.mjs
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RelicMcpClient {
  constructor(binaryPath) {
    const ext = process.platform === 'win32' ? '.exe' : '';
    const candidates = [
      binaryPath,
      process.env.RELIC_MCP_BIN,
      path.resolve(__dirname, `../relic_mcp/target/release/relic_mcp${ext}`),
      path.resolve(__dirname, `../relic_mcp/target/debug/relic_mcp${ext}`),
      path.resolve(__dirname, `../../relic_mcp/target/release/relic_mcp${ext}`),
      path.resolve(__dirname, `../../relic_mcp/target/debug/relic_mcp${ext}`),
    ].filter(Boolean);
    this.binaryPath = candidates.find(p => fs.existsSync(p)) || candidates[0];
    this.process = null;
    this.rl = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.tools = [];
    this.isInitialized = false;
  }

  async start() {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.binaryPath)) {
        this.isInitialized = false;
        return reject(new Error(`Binario no encontrado en "${this.binaryPath}". Se usarán las herramientas locales en JS.`));
      }

      try {
        this.process = spawn(this.binaryPath, [], {
          stdio: ['pipe', 'pipe', 'inherit'],
          windowsHide: true,
        });

        this.process.on('error', (err) => {
          this.isInitialized = false;
          reject(err);
        });

        this.process.on('exit', (code, signal) => {
          this.isInitialized = false;
        });

        this.rl = readline.createInterface({
          input: this.process.stdout,
          crlfDelay: Infinity,
        });

        this.rl.on('line', (line) => {
          this._handleLine(line);
        });

        // Inicializar MCP
        this.sendRequest('initialize', {})
          .then(async (initResp) => {
            console.log('[RelicMcpClient] Inicializado con éxito:', initResp.serverInfo);
            this.isInitialized = true;
            // Listar herramientas
            const toolsResp = await this.sendRequest('tools/list', {});
            this.tools = toolsResp.tools || [];
            console.log(`[RelicMcpClient] ${this.tools.length} herramientas cargadas desde RELIC.`);
            resolve(this.tools);
          })
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  _handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
        const { resolve, reject } = this.pendingRequests.get(msg.id);
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(`MCP Error ${msg.error.code}: ${msg.error.message}`));
        } else {
          resolve(msg.result);
        }
      }
    } catch (e) {
      console.warn('[RelicMcpClient] Error parseando línea JSON-RPC:', trimmed, e);
    }
  }

  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }) + '\n';

      this.process.stdin.write(payload, 'utf-8', (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          reject(err);
        }
      });
    });
  }

  async callTool(name, args = {}) {
    return this.sendRequest('tools/call', {
      name,
      arguments: args,
    });
  }

  getOpenAiToolsSchema() {
    return this.tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema || { type: 'object', properties: {} },
      },
    }));
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

