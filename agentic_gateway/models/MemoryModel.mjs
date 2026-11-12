// Simple Domain — Memory Model
// Capa Modelo: Entidad y persistencia de memoria episódica de RELIC.
import fs from 'node:fs/promises';
import path from 'node:path';

export class MemoryModel {
  constructor(filePath) {
    this.filePath = filePath;
    this.memories = [];
  }

  async init() {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) this.memories = list;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        const corruptPath = `${this.filePath}.corrupt.${Date.now()}`;
        console.error(`[MemoryModel] Archivo de memorias corrupto o ilegible. Aislado en: ${corruptPath}`, err);
        try {
          await fs.copyFile(this.filePath, corruptPath);
        } catch (copyErr) {
          console.error('[MemoryModel] Falló respaldo de aislamiento:', copyErr);
        }
      }
      this.memories = [];
    }
  }

  async add(topic, conclusion) {
    const entry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      topic: (topic || 'General').trim(),
      conclusion: (conclusion || '').trim(),
    };
    this.memories.push(entry);
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const tempPath = `${this.filePath}.${Date.now()}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(this.memories, null, 2), 'utf-8');
      await fs.rename(tempPath, this.filePath);
    } catch (err) {
      console.error('[MemoryModel] Error escribiendo memoria:', err.message);
      this.memories.pop();
      throw err;
    }
    return entry;
  }

  async delete(id) {
    const idx = this.memories.findIndex((m) => m.id === id);
    if (idx !== -1) {
      const removed = this.memories[idx];
      const nextMemories = this.memories.filter((_, i) => i !== idx);
      try {
        const tempPath = `${this.filePath}.${Date.now()}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(nextMemories, null, 2), 'utf-8');
        await fs.rename(tempPath, this.filePath);
        this.memories = nextMemories;
        return removed;
      } catch (err) {
        console.error('[MemoryModel] Error al persistir borrado:', err.message);
        throw err;
      }
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

export const RelicMemoryStore = MemoryModel;
