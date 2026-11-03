// Simple Domain — Definición y Despacho de Herramientas MCP
import fs from 'node:fs/promises';
import path from 'node:path';

export const LOCAL_TOOLS = [
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
  {
    type: 'function',
    function: {
      name: 'relic_fs_modify',
      description: 'Lee, crea, sobrescribe o elimina archivos y directorios en disco (servido por el microkernel RELIC en Rust).',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta relativa del archivo o carpeta (por defecto en cuarentena si no se especifica ruta completa)',
          },
          action: {
            type: 'string',
            enum: ['read', 'create', 'write', 'delete', 'mkdir', 'list'],
            description: 'Acción a ejecutar en el sistema de archivos',
          },
          content: {
            type: 'string',
            description: 'Contenido en texto plano para operaciones de escritura/creación',
          },
        },
        required: ['path', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'relic_web_search',
      description: 'Ejecuta búsquedas web técnicas sin API key y devuelve texto limpio de vulnerabilidades o documentación (servido por el microkernel RELIC en Rust).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Consulta técnica, documentación o análisis de vulnerabilidades',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'relic_memorize',
      description: 'Guarda una conclusión técnica o descubrimiento en la memoria episódica persistente de RELIC.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Tema o componente investigado (ej: Buffer Overflow CVE-XXXX, Rutina de descifrado)',
          },
          conclusion: {
            type: 'string',
            description: 'Conclusión técnica que debe recordarse en futuras sesiones',
          },
        },
        required: ['topic', 'conclusion'],
      },
    },
  },
];

/**
 * Ejecutor de herramientas: prioriza el Servidor MCP en RELIC Rust.
 */
export async function executeTool(name, args, { mcpClient, relicMemoryStore, quarantineDir }) {
  // 1. Delegar primariamente al Servidor MCP en Rust si está disponible
  if (mcpClient && mcpClient.isInitialized) {
    try {
      const mcpResult = await mcpClient.callTool(name, args);
      if (mcpResult) {
        // Si la herramienta fue relic_memorize, sincronizar también en relic_memory.json
        if (name === 'relic_memorize' && relicMemoryStore && args.topic && args.conclusion) {
          await relicMemoryStore.add(args.topic, args.conclusion);
        }
        return mcpResult;
      }
    } catch (mcpErr) {
      console.warn(`[MCP Tool Dispatch] El servidor RELIC Rust falló para '${name}', intentando fallback local:`, mcpErr.message);
    }
  }

  // 2. Fallbacks locales resilientes
  if (name === 'read_code_file') {
    try {
      const filePath = path.resolve(args.path);
      const content = await fs.readFile(filePath, 'utf-8');
      return { content: [{ type: 'text', text: content }], isError: false };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error leyendo archivo: ${e.message}` }], isError: true };
    }
  }

  if (name === 'relic_fs_modify') {
    try {
      const action = (args.action || 'read').toLowerCase();
      let targetPath = args.path || '';

      if (!path.isAbsolute(targetPath)) {
        if (!targetPath.startsWith('quarantine') && !targetPath.startsWith('./quarantine')) {
          targetPath = path.join(quarantineDir, targetPath);
        } else {
          targetPath = path.resolve(process.cwd(), targetPath);
        }
      }

      if (action === 'read') {
        const text = await fs.readFile(targetPath, 'utf-8');
        return { content: [{ type: 'text', text }], isError: false, action, path: targetPath };
      }

      if (action === 'create' || action === 'write') {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        const contentToWrite = args.content !== undefined ? args.content : '';
        await fs.writeFile(targetPath, contentToWrite, 'utf-8');
        return {
          content: [{ type: 'text', text: `[OK] Archivo guardado exitosamente en: ${targetPath} (${Buffer.byteLength(contentToWrite, 'utf-8')} bytes)` }],
          isError: false,
          action,
          path: targetPath,
          bytes: Buffer.byteLength(contentToWrite, 'utf-8'),
        };
      }

      if (action === 'mkdir') {
        await fs.mkdir(targetPath, { recursive: true });
        return { content: [{ type: 'text', text: `[OK] Directorio creado exitosamente: ${targetPath}` }], isError: false, action, path: targetPath };
      }

      if (action === 'delete') {
        await fs.rm(targetPath, { recursive: true, force: true });
        return { content: [{ type: 'text', text: `[OK] Eliminado exitosamente: ${targetPath}` }], isError: false, action, path: targetPath };
      }

      if (action === 'list') {
        const entries = await fs.readdir(targetPath, { withFileTypes: true });
        const summary = entries.map((e) => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' }));
        return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }], isError: false, action, path: targetPath, entries: summary };
      }

      return { content: [{ type: 'text', text: `Acción no soportada: '${action}'.` }], isError: true };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error en relic_fs_modify: ${err.message}` }], isError: true };
    }
  }

  if (name === 'relic_web_search') {
    try {
      const q = encodeURIComponent(args.query || '');
      const searchUrl = `https://html.duckduckgo.com/html/?q=${q}`;
      const resp = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      });

      if (!resp.ok) {
        return { content: [{ type: 'text', text: `Error en búsqueda web (HTTP ${resp.status})` }], isError: true };
      }

      const html = await resp.text();
      const results = [];
      const blocks = html.split(/class=["']result results_links/);

      for (let i = 1; i < blocks.length && results.length < 5; i++) {
        const b = blocks[i];
        const titleM = b.match(/<a[^>]*class=["']result__a["'][^>]*>([\s\S]*?)<\/a>/i);
        const snippetM = b.match(/<a[^>]*class=["']result__snippet["'][^>]*>([\s\S]*?)<\/a>/i);
        const urlM = b.match(/<a[^>]*class=["']result__url["'][^>]*href=["']([^"']+)["']/i);

        const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : '';
        const snippet = snippetM ? snippetM[1].replace(/<[^>]+>/g, '').trim() : '';
        let url = urlM ? urlM[1].trim() : '';

        if (url.includes('uddg=')) {
          const matched = url.match(/uddg=([^&]+)/);
          if (matched) {
            try { url = decodeURIComponent(matched[1]); } catch {}
          }
        }

        if (title || snippet) {
          results.push({ title, snippet, url });
        }
      }

      let formatted = `Resultados web para "${args.query}":\n\n`;
      if (results.length === 0) {
        formatted += `No se encontraron resultados inmediatos para la consulta.`;
      } else {
        formatted += results.map((r, idx) => `### ${idx + 1}. ${r.title}\n- **URL:** ${r.url}\n- **Resumen:** ${r.snippet}`).join('\n\n');
      }

      return { content: [{ type: 'text', text: formatted }], isError: false, results };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error ejecutando búsqueda web: ${err.message}` }], isError: true };
    }
  }

  if (name === 'relic_memorize') {
    try {
      const entry = await relicMemoryStore.add(args.topic, args.conclusion);
      return {
        content: [{
          type: 'text',
          text: `[MEMORIZADO] Conclusión guardada con éxito en la memoria persistente de RELIC:\n- Tema: ${entry.topic}\n- Conclusión: ${entry.conclusion}\n- ID: ${entry.id}`
        }],
        isError: false,
        entry,
      };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error en relic_memorize: ${err.message}` }], isError: true };
    }
  }

  return { content: [{ type: 'text', text: `Herramienta desconocida: '${name}'` }], isError: true };
}

