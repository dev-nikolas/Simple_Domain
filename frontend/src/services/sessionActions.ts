/**
 * Simple Domain — Acciones y Operaciones de Sesión (Offline-First)
 * Principio de Responsabilidad Única (SRP): Operaciones CRUD locales y sincronización con API.
 */

import { sessionsApi, ChatSessionDetail, ChatSessionSummary } from './sessionsApi';
import {
  saveActiveSessionMessages,
  saveSessionsBackup,
  loadSessionsBackup,
  loadActiveSessionMessages,
  removeSessionStorage,
} from './sessionStorage';

export const DEFAULT_PROMPT = '';

export async function createSessionRecord(
  isOffline: boolean,
  currentSessions: ChatSessionSummary[]
): Promise<{ detail: ChatSessionDetail; summary: ChatSessionSummary; nextList: ChatSessionSummary[] }> {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const detail: ChatSessionDetail = {
    id,
    title: 'Nueva Conversación',
    messages: [],
    updatedAt: Date.now(),
  };

  if (!isOffline) {
    try {
      const created = await sessionsApi.create({ id, title: 'Nueva Conversación', messages: [] });
      if (created?.id) detail.id = created.id;
    } catch {}
  }

  saveActiveSessionMessages(detail.id, detail.messages);
  const summary: ChatSessionSummary = {
    id: detail.id,
    title: detail.title,
    updatedAt: detail.updatedAt,
    messageCount: 0,
  };

  const nextList = [summary, ...currentSessions.filter((s) => s.id !== summary.id)];
  saveSessionsBackup(nextList);
  return { detail, summary, nextList };
}

export async function deleteSessionRecord(
  id: string,
  isOffline: boolean,
  currentSessions: ChatSessionSummary[]
): Promise<ChatSessionSummary[]> {
  removeSessionStorage(id);
  const nextList = currentSessions.filter((s) => s.id !== id);
  saveSessionsBackup(nextList);
  if (!isOffline) {
    try {
      await sessionsApi.delete(id);
    } catch {}
  }
  return nextList;
}

export async function renameSessionRecord(
  id: string,
  newTitle: string,
  isOffline: boolean,
  currentSessions: ChatSessionSummary[]
): Promise<ChatSessionSummary[]> {
  const nextList = currentSessions.map((s) => (s.id === id ? { ...s, title: newTitle } : s));
  saveSessionsBackup(nextList);
  if (!isOffline) {
    try {
      await sessionsApi.rename(id, newTitle);
    } catch {}
  }
  return nextList;
}

export async function reconcileOfflineSessions(
  serverList: ChatSessionSummary[]
): Promise<ChatSessionSummary[]> {
  const localBackup = loadSessionsBackup();
  const serverIds = new Set(serverList.map((s) => s.id));
  const orphans = localBackup.filter((s) => !serverIds.has(s.id) && s.id !== 'local-default');

  const merged = [...serverList];
  for (const orphan of orphans) {
    try {
      const msgs = loadActiveSessionMessages(orphan.id);
      await sessionsApi.create({ id: orphan.id, title: orphan.title, messages: msgs });
      merged.push(orphan);
    } catch {
      merged.push(orphan);
    }
  }
  return merged;
}

