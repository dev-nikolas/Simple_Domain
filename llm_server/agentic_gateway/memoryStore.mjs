// Simple Domain — Almacén Persistente de Memoria Episódica RELIC (relic_memory.json)
import fs from 'node:fs/promises';
import path from 'node:path';

export class RelicMemoryStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.memories = [];
  }

  async init() {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        this.memories = list;
      }
      console.log(`[RelicMemoryStore] ${this.memories.length} conclusiones cargadas desde ${this.filePath}`);
    } catch {
      this.memories = [];
      console.log(`[RelicMemoryStore] Inicializando nuevo almacén en ${this.filePath}`);
    }
  }

  async add(topic, conclusion) {
    const safeTopic = (topic || 'General').trim();
    const safeConclusion = (conclusion || '').trim();
    const entry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      topic: safeTopic,
      conclusion: safeConclusion,
    };
    this.memories.push(entry);
    try {
      const tempPath = `${this.filePath}.${Date.now()}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(this.memories, null, 2), 'utf-8');
      await fs.rename(tempPath, this.filePath);
      console.log(`[RelicMemoryStore] Conclusión persistida: [${entry.topic}]`);
    } catch (err) {
      console.error('[RelicMemoryStore] Error escribiendo memoria:', err.message);
    }
    return entry;
  }

  async delete(id) {
    const idx = this.memories.findIndex((m) => m.id === id);
    if (idx !== -1) {
      const removed = this.memories.splice(idx, 1)[0];
      try {
        await fs.writeFile(this.filePath, JSON.stringify(this.memories, null, 2), 'utf-8');
      } catch {}
      return removed;
    }
    return null;
  }

  getAll() {
    return this.memories;
  }

  getSystemPromptMemoryContext() {
    if (this.memories.length === 0) return '';
    const recent = this.memories.slice(-10);
    const lines = recent.map((m) => `- [${m.topic}] (${m.timestamp ? m.timestamp.split('T')[0] : 'histórico'}): ${m.conclusion}`);
    return `\n\n[MEMORIA EPISÓDICA DE INVESTIGACIONES Y DESCUBRIMIENTOS PREVIOS]\n${lines.join('\n')}`;
  }
}

