// Simple Domain — Almacén Persistente de Sesiones (JSON Atómico con Flush Debounced)
import fs from 'node:fs/promises';
import path from 'node:path';

export class SessionStore {
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
          if (s && s.id) {
            this.sessions.set(s.id, s);
          }
        }
      }
      console.log(`[SessionStore] ${this.sessions.size} sesiones cargadas desde ${this.filePath}`);
    } catch {
      console.log(`[SessionStore] Inicializando nuevo almacén en ${this.filePath}`);
    }

    if (this.sessions.size === 0) {
      const defaultId = Date.now().toString();
      this.sessions.set(defaultId, {
        id: defaultId,
        title: 'Nueva Conversación',
        messages: [{ role: 'system', content: this.defaultSystemPrompt }],
        updatedAt: Date.now(),
      });
      this.scheduleSave();
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
        const list = Array.from(this.sessions.values());
        const tempPath = `${this.filePath}.${Date.now()}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(list, null, 2), 'utf-8');
        await fs.rename(tempPath, this.filePath);
      } catch (err) {
        console.error('[SessionStore] Error guardando sesiones en disco:', err);
      }
    }, 400);
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
    const id = data.id || Date.now().toString();
    const title = data.title || 'Nueva Conversación';
    const messages = Array.isArray(data.messages) && data.messages.length > 0
      ? data.messages
      : [{ role: 'system', content: this.defaultSystemPrompt }];

    const session = {
      id,
      title,
      messages,
      updatedAt: Date.now(),
    };
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
      if (this.sessions.size === 0) {
        this.create({ title: 'Nueva Conversación' });
      }
      this.scheduleSave();
    }
    return existed;
  }

  addMessage(id, message) {
    let s = this.sessions.get(id);
    if (!s) {
      s = this.create({ id });
    }
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
    if (!s) {
      s = this.create({ id, messages });
      return s;
    }
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

