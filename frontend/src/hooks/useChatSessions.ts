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
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGatewayOffline, setIsGatewayOffline] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, startTransition] = useTransition();

  const isOfflineRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const sessionsRef = useRef<ChatSessionSummary[]>(sessions);
  sessionsRef.current = sessions;
  const activeSessionRef = useRef<ChatSessionDetail | null>(activeSession);
  activeSessionRef.current = activeSession;

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
      const localDetail = { id, title: fallbackTitle, messages: fallbackMsgs, updatedAt: Date.now() };
      activeSessionRef.current = localDetail;
      setActiveSession(localDetail);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const detail = await sessionsApi.get(id);
      const mergedMessages = detail.messages && detail.messages.length > 1
        ? detail.messages
        : (cached.length > (detail.messages?.length || 0) ? cached : (detail.messages || fallbackMsgs));
      const finalDetail = { ...detail, messages: mergedMessages };
      activeSessionRef.current = finalDetail;
      setActiveSession(finalDetail);
      saveActiveSessionMessages(id, mergedMessages);
      setIsGatewayOffline(false);
      isOfflineRef.current = false;
    } catch {
      setIsGatewayOffline(true);
      isOfflineRef.current = true;
      const fallbackDetail = { id, title: fallbackTitle, messages: fallbackMsgs, updatedAt: Date.now() };
      activeSessionRef.current = fallbackDetail;
      setActiveSession(fallbackDetail);
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
        setActiveSessionIdState(targetId);
        await fetchSessionDetail(targetId, list);
      } else {
        setActiveSessionIdState(null);
        activeSessionRef.current = null;
        setActiveSession(null);
      }
      setIsLoading(false);
    })();
  }, [fetchSessions, fetchSessionDetail]);

  const createNewSession = useCallback(async () => {
    const { detail, nextList } = await createSessionRecord(isOfflineRef.current, sessionsRef.current);
    activeSessionRef.current = detail;
    setSessions(nextList);
    setActiveSessionIdState(detail.id);
    setActiveSession(detail);
    return detail;
  }, []);

  const renameSession = useCallback(async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const nextList = await renameSessionRecord(id, trimmed, isOfflineRef.current, sessionsRef.current);
    setSessions(nextList);
    if (activeSessionRef.current?.id === id) {
      setActiveSession((prev) => {
        const next = prev ? { ...prev, title: trimmed } : null;
        activeSessionRef.current = next;
        return next;
      });
    }
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    const nextList = await deleteSessionRecord(id, isOfflineRef.current, sessionsRef.current);
    setSessions(nextList);
    if (activeSessionId === id) {
      if (nextList.length > 0) {
        setActiveSessionIdState(nextList[0].id);
        fetchSessionDetail(nextList[0].id, nextList);
      } else {
        createNewSession();
      }
    }
  }, [activeSessionId, fetchSessionDetail, createNewSession]);

  const updateActiveSessionMessages = useCallback((newMessages: Message[], targetId?: string) => {
    const sessionId = targetId || activeSessionRef.current?.id || activeSessionId;
    setActiveSession((prev) => {
      const base = prev || (sessionId ? { id: sessionId, title: 'Nueva Conversación', messages: [], updatedAt: Date.now() } : null);
      if (!base) return null;
      let title = base.title;
      if (title === 'Nueva Conversación') {
        const firstUser = newMessages.find((m) => m.role === 'user');
        if (firstUser?.content.trim()) {
          const clean = firstUser.content.trim().replace(/\n+/g, ' ');
          title = clean.length > 36 ? clean.substring(0, 36) + '...' : clean;
        }
      }
      const updated = { ...base, title, messages: newMessages, updatedAt: Date.now() };
      activeSessionRef.current = updated;
      saveActiveSessionMessages(updated.id, updated.messages);
      return updated;
    });
    if (sessionId) {
      setSessions((prev) => {
        const updated = prev.map((s) => (
          s.id === sessionId
            ? { ...s, messageCount: newMessages.filter((m) => m.role !== 'system').length, updatedAt: Date.now() }
            : s
        ));
        saveSessionsBackup(updated);
        return updated;
      });
    }
  }, [activeSessionId]);

  const setActiveSessionId = useCallback((id: string | null) => {
    startTransition(() => setActiveSessionIdState(id));
    if (id) {
      if (activeSessionRef.current?.id !== id) {
        fetchSessionDetail(id);
      }
    } else {
      activeSessionRef.current = null;
      setActiveSession(null);
    }
  }, [fetchSessionDetail]);

  const getActiveMessages = useCallback(() => activeSessionRef.current?.messages || [], []);

  return {
    sessions: sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())),
    allSessions: sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    activeMessages: activeSession?.messages || [],
    getActiveMessages,
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
