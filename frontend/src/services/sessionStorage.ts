/**
 * Simple Domain — Almacenamiento Local de Respaldo para Sesiones
 * Principio de Responsabilidad Única (SRP): Serialización y recuperación en localStorage.
 */

import { ChatSessionSummary } from './sessionsApi';

const LOCAL_STORAGE_KEY = 'relic_chat_sessions_backup';

export function saveSessionsBackup(sessions: ChatSessionSummary[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignorar cuota excedida
  }
}

export function loadSessionsBackup(): ChatSessionSummary[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveActiveSessionMessages(sessionId: string, messages: any[]): void {
  try {
    localStorage.setItem(`relic_session_${sessionId}`, JSON.stringify(messages));
    localStorage.setItem('relic_active_session_id', sessionId);
  } catch {
    // Ignorar fallback
  }
}

