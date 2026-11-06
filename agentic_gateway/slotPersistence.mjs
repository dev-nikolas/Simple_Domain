// Simple Domain — Gestor de Persistencia de KV Slots en Disco (--slot-save-path)
import fs from 'node:fs/promises';
import path from 'node:path';

export class SlotPersistenceManager {
  constructor({ llamaBaseUrl, cacheDir, maxBytes, tokenThreshold }) {
    this.llamaBaseUrl = llamaBaseUrl.replace(/\/+$/, '');
    this.cacheDir = cacheDir;
    this.maxBytes = maxBytes;
    this.tokenThreshold = tokenThreshold;
    this.saveDebounceTimers = new Map();
  }

  async init() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch {}
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
      console.log(`[SlotPersistence] Snapshot eliminado para sesión ${sessionId}`);
    } catch {}
  }

  async enforceMaxCacheSize() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const fileStats = [];
      let totalBytes = 0;

      for (const file of files) {
        if (!file.endsWith('.bin')) continue;
        const filePath = path.join(this.cacheDir, file);
        const st = await fs.stat(filePath);
        totalBytes += st.size;
        fileStats.push({ filePath, size: st.size, mtime: st.mtimeMs });
      }

      if (totalBytes > this.maxBytes) {
        fileStats.sort((a, b) => a.mtime - b.mtime);
        while (totalBytes > this.maxBytes && fileStats.length > 0) {
          const oldest = fileStats.shift();
          try {
            await fs.unlink(oldest.filePath);
            totalBytes -= oldest.size;
            console.log(`[SlotPersistence] Limpieza LRU: eliminado snapshot ${path.basename(oldest.filePath)}`);
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[SlotPersistence] Error ejecutando enforceMaxCacheSize:', err.message);
    }
  }

  async getSlots() {
    try {
      const res = await fetch(`${this.llamaBaseUrl}/slots`);
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
      const restoreUrl = `${this.llamaBaseUrl}/slots/${idleSlot.id}?action=restore`;
      const res = await fetch(restoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (res.ok) {
        console.log(`[SlotPersistence] Slot ${idleSlot.id} restaurado exitosamente desde disco para sesión ${sessionId}`);
        return true;
      } else {
        const errText = await res.text();
        console.warn(`[SlotPersistence] llama-server rechazó restore en slot ${idleSlot.id} (${res.status}): ${errText}`);
      }
    } catch (err) {
      console.warn(`[SlotPersistence] Fallo restaurando slot para sesión ${sessionId} (fallback automático a recálculo):`, err.message);
    }
    return false;
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
        const anyBusy = slots.some((s) => s.is_processing);
        if (anyBusy) {
          // Reintentar en 3 segundos si otro slot está generando
          this.scheduleSave(sessionId, approxTokens);
          return;
        }

        const targetSlot = slots.find((s) => s.n_prompt_tokens > 0) || slots[0];
        if (!targetSlot) return;

        const filename = this.getSnapshotFilename(sessionId);
        const saveUrl = `${this.llamaBaseUrl}/slots/${targetSlot.id}?action=save`;
        const res = await fetch(saveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename }),
        });

        if (res.ok) {
          console.log(`[SlotPersistence] Guardado snapshot en disco para sesión ${sessionId} (~${approxTokens} tok)`);
          await this.enforceMaxCacheSize();
        }
      } catch (err) {
        console.warn(`[SlotPersistence] Error guardando slot para sesión ${sessionId}:`, err.message);
      }
    }, 4000);

    this.saveDebounceTimers.set(sessionId, timer);
  }
}

