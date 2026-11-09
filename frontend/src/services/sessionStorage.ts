/**
 * Simple Domain — Almacenamiento y Caché Local de Sesiones
 * Principio de Responsabilidad Única (SRP): Serialización, persistencia y eliminación en localStorage.
 */

import { ChatSessionSummary } from './sessionsApi';

const SESSIONS_KEY = 'relic_chat_sessions_backup';

export function saveSessionsBackup(sessions: ChatSessionSummary[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}
}

export function loadSessionsBackup(): ChatSessionSummary[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveActiveSessionMessages(sessionId: string, messages: any[]): void {
  try {
    localStorage.setItem(`relic_session_${sessionId}`, JSON.stringify(messages));
    localStorage.setItem('relic_active_session_id', sessionId);
  } catch {}
}

export function loadActiveSessionMessages(sessionId: string): any[] {
  try {
    const raw = localStorage.getItem(`relic_session_${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeSessionStorage(sessionId: string): void {
  try {
    localStorage.removeItem(`relic_session_${sessionId}`);
  } catch {}
}
