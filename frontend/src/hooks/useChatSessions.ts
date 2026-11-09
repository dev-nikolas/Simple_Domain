/**
 * Simple Domain — Hook useChatSessions
 * Principio de Responsabilidad Única (SRP): Gestión de estado reactivo de sesiones.
 */

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { sessionsApi, ChatSessionSummary, ChatSessionDetail } from '../services/sessionsApi';
import { Message } from '../types/relic';
import {
  saveSessionsBackup,
  loadSessionsBackup,
  saveActiveSessionMessages,
  loadActiveSessionMessages,
} from '../services/sessionStorage';
import {
  DEFAULT_PROMPT,
  createSessionRecord,
  deleteSessionRecord,
  renameSessionRecord,
  reconcileOfflineSessions,
} from '../services/sessionActions';

export const DEFAULT_SYSTEM_PROMPT = DEFAULT_PROMPT;

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGatewayOffline, setIsGatewayOffline] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, startTransition] = useTransition();

  const isOfflineRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const sessionsRef = useRef<ChatSessionSummary[]>(sessions);
  sessionsRef.current = sessions;

  const fetchSessions = useCallback(async () => {
    try {
      const serverList = await sessionsApi.list();
      const reconciled = await reconcileOfflineSessions(serverList);
      setSessions(reconciled);
      saveSessionsBackup(reconciled);
      setIsGatewayOffline(false);
      isOfflineRef.current = false;
      return reconciled;
    } catch {
      setIsGatewayOffline(true);
      isOfflineRef.current = true;
      const backup = loadSessionsBackup();
      const initial = backup.length > 0 ? backup : [
        { id: 'local-default', title: 'Nueva Conversación', updatedAt: Date.now(), messageCount: 0 }
      ];
      setSessions(initial);
      return initial;
    }
  }, []);

  const fetchSessionDetail = useCallback(async (id: string, currentList?: ChatSessionSummary[]) => {
    const cached = loadActiveSessionMessages(id);
    const listToSearch = currentList || sessionsRef.current;
    const fallbackTitle = listToSearch.find((s) => s.id === id)?.title || 'Nueva Conversación';
    const fallbackMsgs = cached.length > 0 ? cached : [{ role: 'system', content: DEFAULT_PROMPT }];

    if (isOfflineRef.current) {
      setActiveSession({ id, title: fallbackTitle, messages: fallbackMsgs, updatedAt: Date.now() });
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const detail = await sessionsApi.get(id);
      setActiveSession(detail);
      if (detail.messages) saveActiveSessionMessages(id, detail.messages);
      setIsGatewayOffline(false);
      isOfflineRef.current = false;
    } catch {
      setIsGatewayOffline(true);
      isOfflineRef.current = true;
      setActiveSession({ id, title: fallbackTitle, messages: fallbackMsgs, updatedAt: Date.now() });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    (async () => {
      const list = await fetchSessions();
      const match = window.location.pathname.match(/^\/c\/([^/]+)$/);
      if (match) {
        const targetId = match[1];
        setActiveSessionId(targetId);
        await fetchSessionDetail(targetId, list);
      } else {
        setActiveSessionId(null);
        setActiveSession(null);
      }
      setIsLoading(false);
    })();
  }, [fetchSessions, fetchSessionDetail]);

  const createNewSession = useCallback(async () => {
    const { detail, nextList } = await createSessionRecord(isOfflineRef.current, sessions);
    setSessions(nextList);
    setActiveSessionId(detail.id);
    setActiveSession(detail);
    return detail;
  }, [sessions]);

  const renameSession = useCallback(async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const nextList = await renameSessionRecord(id, trimmed, isOfflineRef.current, sessions);
    setSessions(nextList);
    if (activeSession?.id === id) setActiveSession((prev) => (prev ? { ...prev, title: trimmed } : null));
  }, [activeSession?.id, sessions]);

  const deleteSession = useCallback(async (id: string) => {
    const nextList = await deleteSessionRecord(id, isOfflineRef.current, sessions);
    setSessions(nextList);
    if (activeSessionId === id) {
      if (nextList.length > 0) {
        setActiveSessionId(nextList[0].id);
        fetchSessionDetail(nextList[0].id, nextList);
      } else {
        createNewSession();
      }
    }
  }, [activeSessionId, sessions, fetchSessionDetail, createNewSession]);

  const updateActiveSessionMessages = useCallback((newMessages: Message[]) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      let title = prev.title;
      if (title === 'Nueva Conversación') {
        const firstUser = newMessages.find((m) => m.role === 'user');
        if (firstUser?.content.trim()) {
          const clean = firstUser.content.trim().replace(/\n+/g, ' ');
          title = clean.length > 36 ? clean.substring(0, 36) + '...' : clean;
        }
      }
      const updated = { ...prev, title, messages: newMessages, updatedAt: Date.now() };
      saveActiveSessionMessages(updated.id, updated.messages);
      return updated;
    });
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === activeSessionId ? { ...s, messageCount: newMessages.filter((m) => m.role !== 'system').length, updatedAt: Date.now() } : s));
      saveSessionsBackup(updated);
      return updated;
    });
  }, [activeSessionId]);

  return {
    sessions: sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())),
    allSessions: sessions,
    activeSessionId,
    setActiveSessionId: (id: string | null) => {
      startTransition(() => setActiveSessionId(id));
      if (id) fetchSessionDetail(id);
      else setActiveSession(null);
    },
    activeSession,
    activeMessages: activeSession?.messages || [],
    isLoading,
    isGatewayOffline,
    error: isGatewayOffline ? 'Gateway desconectado' : null,
    retryConnection: () => { sessionsApi.resetCircuitBreaker(); return fetchSessions(); },
    searchQuery,
    setSearchQuery,
    createNewSession,
    renameSession,
    deleteSession,
    updateActiveSessionMessages,
  };
}
