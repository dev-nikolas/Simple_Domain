// Simple Domain — Session Model
// Capa Modelo: Entidad y persistencia de conversaciones y mensajes.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export class SessionModel {
  constructor(filePath, defaultSystemPrompt) {
    this.filePath = filePath;
    this.defaultSystemPrompt = defaultSystemPrompt;
    this.sessions = new Map();
    this.saveTimeout = null;
    this.isDirty = false;
  }

  async init() {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const s of list) {
          if (s?.id) this.sessions.set(s.id, s);
        }
      }
    } catch {
      // Almacén vacío
    }

    if (this.sessions.size === 0) {
      // Almacen inicial limpio: no forzar sesiones vacias por defecto
    }
  }

  scheduleSave() {
    this.isDirty = true;
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(async () => {
      this.saveTimeout = null;
      if (!this.isDirty) return;
      this.isDirty = false;
      try {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const list = Array.from(this.sessions.values());
        const tempPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(list, null, 2), 'utf-8');
        try {
          await fs.rename(tempPath, this.filePath);
        } catch {
          await fs.copyFile(tempPath, this.filePath);
          await fs.unlink(tempPath).catch(() => {});
        }
      } catch (err) {
        console.error('[SessionModel] Error guardando sesiones:', err);
      }
    }, 400);
  }

  close() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  list() {
    return Array.from(this.sessions.values())
      .map((s) => ({
        id: s.id,
        title: s.title || 'Nueva Conversación',
        updatedAt: s.updatedAt || Date.now(),
        messageCount: (s.messages || []).filter((m) => m.role !== 'system').length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  get(id, limit, offset) {
    const s = this.sessions.get(id);
    if (!s) return null;
    let msgs = s.messages || [];
    if (offset !== undefined || limit !== undefined) {
      const off = Math.max(0, parseInt(offset || '0', 10));
      const lim = Math.max(1, parseInt(limit || '100', 10));
      msgs = msgs.slice(off, off + lim);
    }
    return { ...s, messages: msgs };
  }

  create(data = {}) {
    const id = data.id || crypto.randomUUID();
    const title = data.title || 'Nueva Conversación';
    const messages = Array.isArray(data.messages)
      ? data.messages
      : [];

    const session = { id, title, messages, updatedAt: Date.now() };
    this.sessions.set(id, session);
    this.scheduleSave();
    return session;
  }

  updateTitle(id, title) {
    const s = this.sessions.get(id);
    if (!s) return null;
    s.title = title.trim();
    s.updatedAt = Date.now();
    this.scheduleSave();
    return s;
  }

  delete(id) {
    const existed = this.sessions.delete(id);
    if (existed) {
      this.scheduleSave();
    }
    return existed;
  }

  addMessage(id, message) {
    let s = this.sessions.get(id) || this.create({ id });
    if (!s.messages) s.messages = [];
    s.messages.push(message);
    s.updatedAt = Date.now();

    if (s.title === 'Nueva Conversación' && message.role === 'user') {
      const clean = (message.content || '').trim().replace(/\n+/g, ' ');
      if (clean) {
        s.title = clean.length > 36 ? clean.substring(0, 36) + '...' : clean;
      }
    }
    this.scheduleSave();
    return s;
  }

  syncSessionMessages(id, messages) {
    let s = this.sessions.get(id);
    if (!s) return this.create({ id, messages });
    s.messages = messages;
    s.updatedAt = Date.now();
    if (s.title === 'Nueva Conversación') {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      if (firstUserMsg && firstUserMsg.content.trim()) {
        const clean = firstUserMsg.content.trim().replace(/\n+/g, ' ');
        s.title = clean.length > 36 ? clean.substring(0, 36) + '...' : clean;
      }
    }
    this.scheduleSave();
    return s;
  }
}

export const SessionStore = SessionModel;
