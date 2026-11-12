// Simple Domain — Slot Model
// Capa Modelo: Entidad y persistencia en disco de snapshots KV de sesiones.
import fs from 'node:fs/promises';
import path from 'node:path';

export class SlotModel {
  constructor({ relicEngineBaseUrl, cacheDir, maxBytes, tokenThreshold }) {
    this.relicEngineBaseUrl = (relicEngineBaseUrl || 'http://127.0.0.1:8080').replace(/\/+$/, '');
    this.cacheDir = cacheDir;
    this.maxBytes = maxBytes;
    this.tokenThreshold = tokenThreshold;
    this.saveDebounceTimers = new Map();
  }

  async init() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  getSnapshotFilename(sessionId) {
    const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `session_${safeId}.bin`;
  }

  getSnapshotPath(sessionId) {
    return path.join(this.cacheDir, this.getSnapshotFilename(sessionId));
  }

  async hasSnapshot(sessionId) {
    try {
      await fs.access(this.getSnapshotPath(sessionId));
      return true;
    } catch {
      return false;
    }
  }

  async deleteSnapshot(sessionId) {
    try {
      await fs.unlink(this.getSnapshotPath(sessionId));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async enforceMaxCacheSize() {
    try {
      const files = await fs.readdir(this.cacheDir);
      let total = 0;
      const stats = [];

      for (const f of files) {
        if (!f.endsWith('.bin')) continue;
        const p = path.join(this.cacheDir, f);
        try {
          const s = await fs.stat(p);
          stats.push({ path: p, size: s.size, mtime: s.mtimeMs });
          total += s.size;
        } catch (err) {
          console.warn('[SlotModel] No se pudo leer stat de archivo:', p, err.message);
        }
      }

      if (total <= this.maxBytes) return;

      stats.sort((a, b) => a.mtime - b.mtime);
      for (const item of stats) {
        if (total <= this.maxBytes) break;
        try {
          await fs.unlink(item.path);
          total -= item.size;
        } catch (err) {
          console.warn('[SlotModel] Error purgando snapshot excedente:', item.path, err.message);
        }
      }
    } catch (err) {
      console.warn('[SlotModel] Error en ciclo de retencion de cache:', err.message);
    }
  }

  async getSlots() {
    try {
      const res = await fetch(`${this.relicEngineBaseUrl}/slots`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async restoreIfEvicted(sessionId) {
    if (!sessionId) return false;
    const exists = await this.hasSnapshot(sessionId);
    if (!exists) return false;

    try {
      const slots = await this.getSlots();
      const idleSlot = slots.find((s) => !s.is_processing);
      if (!idleSlot) return false;

      const filename = this.getSnapshotFilename(sessionId);
      const restoreUrl = `${this.relicEngineBaseUrl}/slots/${idleSlot.id}?action=restore`;
      const res = await fetch(restoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  scheduleSave(sessionId, approxTokens) {
    if (!sessionId || approxTokens < this.tokenThreshold) return;

    if (this.saveDebounceTimers.has(sessionId)) {
      clearTimeout(this.saveDebounceTimers.get(sessionId));
    }

    const timer = setTimeout(async () => {
      this.saveDebounceTimers.delete(sessionId);
      try {
        const slots = await this.getSlots();
        if (slots.some((s) => s.is_processing)) {
          this.scheduleSave(sessionId, approxTokens);
          return;
        }

        const targetSlot = slots.find((s) => s.n_prompt_tokens > 0) || slots[0];
        if (!targetSlot) return;

        const filename = this.getSnapshotFilename(sessionId);
        const saveUrl = `${this.relicEngineBaseUrl}/slots/${targetSlot.id}?action=save`;
        const res = await fetch(saveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename }),
        });

        if (res.ok) await this.enforceMaxCacheSize();
      } catch (err) {
        console.warn('[SlotModel] Error en persistencia diferida de snapshot:', err.message);
      }
    }, 4000);

    this.saveDebounceTimers.set(sessionId, timer);
  }
}

export const SlotPersistenceManager = SlotModel;

