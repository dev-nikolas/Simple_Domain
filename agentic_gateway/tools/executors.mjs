// Simple Domain — Ejecutores de Herramientas Locales
// Despacho seguro de herramientas con fallback MCP y aislamiento en cuarentena

import fs from 'node:fs/promises';
import path from 'node:path';

export async function executeTool(name, args, { mcpClient, relicMemoryStore, quarantineDir }) {
  if (mcpClient && mcpClient.isInitialized) {
    try {
      const mcpResult = await mcpClient.callTool(name, args);
      if (mcpResult) {
        if (name === 'relic_memorize' && relicMemoryStore && args.topic && args.conclusion) {
          await relicMemoryStore.add(args.topic, args.conclusion);
        }
        return mcpResult;
      }
    } catch (mcpErr) {
      console.warn(`[MCP Tool Dispatch] Servidor RELIC Rust falló para '${name}', usando fallback:`, mcpErr.message);
    }
  }

  if (name === 'read_code_file') {
    return handleReadFile(args);
  }

  if (name === 'relic_fs_modify') {
    return handleFsModify(args, quarantineDir);
  }

  if (name === 'relic_web_search') {
    return handleWebSearch(args);
  }

  if (name === 'relic_memorize') {
    return handleMemorize(args, relicMemoryStore);
  }

  return { content: [{ type: 'text', text: `Herramienta desconocida: '${name}'` }], isError: true };
}

async function handleReadFile(args) {
  try {
    const filePath = path.resolve(args.path);
    const content = await fs.readFile(filePath, 'utf-8');
    return { content: [{ type: 'text', text: content }], isError: false };
  } catch (e) {
    return { content: [{ type: 'text', text: `Error leyendo archivo: ${e.message}` }], isError: true };
  }
}

async function handleMemorize(args, relicMemoryStore) {
  try {
    const entry = await relicMemoryStore.add(args.topic, args.conclusion);
    return {
      content: [{
        type: 'text',
        text: `[MEMORIZADO] Conclusión guardada en memoria persistente:\n- Tema: ${entry.topic}\n- Conclusión: ${entry.conclusion}\n- ID: ${entry.id}`
      }],
      isError: false,
      entry,
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `Error en relic_memorize: ${err.message}` }], isError: true };
  }
}

async function handleFsModify(args, quarantineDir) {
  try {
    const action = (args.action || 'read').toLowerCase();
    let targetPath = args.path || '';

    if (!path.isAbsolute(targetPath)) {
      if (!targetPath.startsWith('quarantine') && !targetPath.startsWith('./quarantine')) {
        targetPath = path.join(quarantineDir || './quarantine', targetPath);
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
      const content = args.content !== undefined ? args.content : '';
      await fs.writeFile(targetPath, content, 'utf-8');
      return {
        content: [{ type: 'text', text: `[OK] Archivo guardado: ${targetPath}` }],
        isError: false,
        action,
        path: targetPath,
      };
    }

    if (action === 'mkdir') {
      await fs.mkdir(targetPath, { recursive: true });
      return { content: [{ type: 'text', text: `[OK] Directorio creado: ${targetPath}` }], isError: false, action, path: targetPath };
    }

    if (action === 'delete') {
      await fs.rm(targetPath, { recursive: true, force: true });
      return { content: [{ type: 'text', text: `[OK] Eliminado: ${targetPath}` }], isError: false, action, path: targetPath };
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

async function handleWebSearch(args) {
  try {
    const q = encodeURIComponent(args.query || '');
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!resp.ok) return { content: [{ type: 'text', text: `Error en búsqueda web (HTTP ${resp.status})` }], isError: true };

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

      if (title || snippet) results.push({ title, snippet, url });
    }

    let formatted = `Resultados de búsqueda para "${args.query}":\n\n`;
    formatted += results.length === 0 ? 'Sin resultados inmediatos.' : results.map((r, i) => `### ${i + 1}. ${r.title}\n- **URL:** ${r.url}\n- **Resumen:** ${r.snippet}`).join('\n\n');
    return { content: [{ type: 'text', text: formatted }], isError: false, results };
  } catch (err) {
    return { content: [{ type: 'text', text: `Error en búsqueda web: ${err.message}` }], isError: true };
  }
}

