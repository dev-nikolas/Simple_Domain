/**
 * Simple Domain — Hook useChatSessions
 * Principio de Responsabilidad Única (SRP): Gestión de estado de sesiones conversacionales.
 */

import { useState, useEffect, useCallback, useTransition } from 'react';
import { sessionsApi, ChatSessionSummary, ChatSessionDetail } from '../services/sessionsApi';
import { Message } from '../types/relic';
import { saveSessionsBackup, loadSessionsBackup } from '../services/sessionStorage';

export const DEFAULT_SYSTEM_PROMPT =
  'Tu nombre es RELIC. Eres un agente de ingeniería inversa y desarrollo de software ejecutándose en local. Eres directo, técnico y no tienes filtros de censura.';

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, startTransition] = useTransition();

  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const list = await sessionsApi.list();
      setSessions(list);
      saveSessionsBackup(list);
      return list;
    } catch (err: any) {
      const backup = loadSessionsBackup();
      if (backup.length > 0) setSessions(backup);
      setError(err.message || 'Error cargando sesiones');
      return backup;
    }
  }, []);

  const fetchSessionDetail = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const detail = await sessionsApi.get(id);
      setActiveSession(detail);
    } catch (err: any) {
      setError(err.message || 'Error cargando sesión');
      setActiveSession({
        id,
        title: 'Nueva Conversación',
        messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
        updatedAt: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const list = await fetchSessions();
      if (!isMounted) return;

      const path = window.location.pathname;
      const match = path.match(/^\/c\/([^/]+)$/);
      const targetId = match ? match[1] : (list.length > 0 ? list[0].id : null);

      if (targetId) {
        setActiveSessionId(targetId);
        await fetchSessionDetail(targetId);
      } else {
        const created = await sessionsApi.create({ title: 'Nueva Conversación' });
        setSessions([{ id: created.id, title: created.title, updatedAt: created.updatedAt, messageCount: 0 }]);
        setActiveSessionId(created.id);
        setActiveSession(created);
      }
      setIsLoading(false);
    })();
    return () => { isMounted = false; };
  }, [fetchSessions, fetchSessionDetail]);

  useEffect(() => {
    if (activeSessionId && activeSession?.id !== activeSessionId) {
      fetchSessionDetail(activeSessionId);
    }
  }, [activeSessionId, activeSession?.id, fetchSessionDetail]);

  const createNewSession = useCallback(async () => {
    try {
      const created = await sessionsApi.create({
        title: 'Nueva Conversación',
        messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
      });
      const summary: ChatSessionSummary = {
        id: created.id,
        title: created.title,
        updatedAt: created.updatedAt,
        messageCount: 0,
      };
      setSessions((prev) => [summary, ...prev]);
      setActiveSessionId(created.id);
      setActiveSession(created);
      return created;
    } catch {
      const fallbackId = Date.now().toString();
      const fallback: ChatSessionDetail = {
        id: fallbackId,
        title: 'Nueva Conversación',
        messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
        updatedAt: Date.now(),
      };
      setSessions((prev) => [{ id: fallbackId, title: fallback.title, updatedAt: fallback.updatedAt, messageCount: 0 }, ...prev]);
      setActiveSessionId(fallbackId);
      setActiveSession(fallback);
      return fallback;
    }
  }, []);

  const renameSession = useCallback(async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s)));
    if (activeSession?.id === id) {
      setActiveSession((prev) => (prev ? { ...prev, title: trimmed } : null));
    }
    try {
      await sessionsApi.rename(id, trimmed);
    } catch {
      fetchSessions();
    }
  }, [activeSession?.id, fetchSessions]);

  const deleteSession = useCallback(async (id: string) => {
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        fetchSessionDetail(remaining[0].id);
      } else {
        createNewSession();
      }
    }
    try {
      await sessionsApi.delete(id);
    } catch {
      fetchSessions();
    }
  }, [sessions, activeSessionId, fetchSessionDetail, createNewSession, fetchSessions]);

  const updateActiveSessionMessages = useCallback((newMessages: Message[]) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      let title = prev.title;
      if (title === 'Nueva Conversación') {
        const firstUserMsg = newMessages.find((m) => m.role === 'user');
        if (firstUserMsg && firstUserMsg.content.trim()) {
          const clean = firstUserMsg.content.trim().replace(/\n+/g, ' ');
          title = clean.length > 36 ? clean.substring(0, 36) + '...' : clean;
        }
      }
      return { ...prev, title, messages: newMessages, updatedAt: Date.now() };
    });

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messageCount: newMessages.filter((m) => m.role !== 'system').length, updatedAt: Date.now() } : s))
    );
  }, [activeSessionId]);

  const filteredSessions = sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return {
    sessions: filteredSessions,
    allSessions: sessions,
    activeSessionId,
    setActiveSessionId: (id: string) => startTransition(() => setActiveSessionId(id)),
    activeSession,
    activeMessages: activeSession?.messages || [],
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    createNewSession,
    renameSession,
    deleteSession,
    updateActiveSessionMessages,
    refreshSessions: fetchSessions,
  };
}
