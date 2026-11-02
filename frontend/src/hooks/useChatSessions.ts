// src/hooks/useChatSessions.ts
import { useState, useEffect, useCallback, useTransition } from 'react';
import { sessionsApi, ChatSessionSummary, ChatSessionDetail } from '../services/sessionsApi';
import { Message } from '../services/llmClient';

export interface ChatSession extends ChatSessionDetail {}

const LOCAL_STORAGE_KEY = 'relic_chat_sessions_backup';
export const DEFAULT_SYSTEM_PROMPT = 'Eres un experto dev. Responde directo, sin preámbulos y solo con el código necesario.';

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, startTransition] = useTransition();

  // 1. Cargar lista de sesiones desde el Gateway
  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const list = await sessionsApi.list();
      setSessions(list);

      // Guardar respaldo en localStorage
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } catch { /* ignore */ }

      return list;
    } catch (err: any) {
      console.warn('[useChatSessions] Gateway no disponible, usando respaldo local:', err);
      try {
        const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (backup) {
          const parsed = JSON.parse(backup);
          setSessions(parsed);
          return parsed;
        }
      } catch { /* ignore */ }
      setError(err.message || 'Error cargando sesiones');
      return [];
    }
  }, []);

  // 2. Cargar sesión individual al cambiar activeSessionId
  const fetchSessionDetail = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const detail = await sessionsApi.get(id);
      setActiveSession(detail);
    } catch (err: any) {
      console.error('[useChatSessions] Error cargando detalle de sesión:', err);
      setError(err.message || 'Error cargando sesión');
      // Crear sesión en memoria si falla
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

  // Inicialización al montar
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const list = await fetchSessions();
      if (!isMounted) return;

      // Obtener id de la URL si existe
      const path = window.location.pathname;
      const match = path.match(/^\/c\/([^/]+)$/);
      const targetId = match ? match[1] : (list.length > 0 ? list[0].id : null);

      if (targetId) {
        setActiveSessionId(targetId);
        await fetchSessionDetail(targetId);
      } else {
        // Crear sesión inicial si el gateway está completamente vacío
        const created = await sessionsApi.create({ title: 'Nueva Conversación' });
        const summary: ChatSessionSummary = {
          id: created.id,
          title: created.title,
          updatedAt: created.updatedAt,
          messageCount: created.messages?.length || 0,
        };
        setSessions([summary]);
        setActiveSessionId(created.id);
        setActiveSession(created);
      }
      setIsLoading(false);
    })();

    return () => { isMounted = false; };
  }, [fetchSessions, fetchSessionDetail]);

  // Sincronizar detalle cuando activeSessionId cambia explícitamente
  useEffect(() => {
    if (activeSessionId && activeSession?.id !== activeSessionId) {
      fetchSessionDetail(activeSessionId);
    }
  }, [activeSessionId, activeSession?.id, fetchSessionDetail]);

  // 3. Crear nueva sesión
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
        messageCount: created.messages?.length || 0,
      };

      setSessions((prev) => [summary, ...prev]);
      setActiveSessionId(created.id);
      setActiveSession(created);
      return created;
    } catch (err: any) {
      // Optimistic fallback
      const fallbackId = Date.now().toString();
      const fallback: ChatSessionDetail = {
        id: fallbackId,
        title: 'Nueva Conversación',
        messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
        updatedAt: Date.now(),
      };
      const fallbackSummary: ChatSessionSummary = {
        id: fallbackId,
        title: fallback.title,
        updatedAt: fallback.updatedAt,
        messageCount: fallback.messages.length,
      };
      setSessions((prev) => [fallbackSummary, ...prev]);
      setActiveSessionId(fallbackId);
      setActiveSession(fallback);
      return fallback;
    }
  }, []);

  // 4. Renombrar sesión
  const renameSession = useCallback(async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    // Actualización optimista
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s))
    );
    if (activeSession?.id === id) {
      setActiveSession((prev) => (prev ? { ...prev, title: trimmed } : null));
    }

    try {
      await sessionsApi.rename(id, trimmed);
    } catch (err) {
      console.error('[useChatSessions] Error renombrando en gateway:', err);
      // Rollback
      fetchSessions();
    }
  }, [activeSession?.id, fetchSessions]);

  // 5. Eliminar sesión
  const deleteSession = useCallback(async (id: string) => {
    // Actualización optimista
    const prevSessions = sessions;
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
    } catch (err) {
      console.error('[useChatSessions] Error eliminando en gateway:', err);
      setSessions(prevSessions);
    }
  }, [sessions, activeSessionId, fetchSessionDetail, createNewSession]);

  // 6. Actualizar mensajes en memoria y sincronizar con Gateway
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
      return {
        ...prev,
        title,
        messages: newMessages,
        updatedAt: Date.now(),
      };
    });

    // Actualizar metadata en la lista de sesiones
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messageCount: newMessages.filter((m) => m.role !== 'system').length,
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );
  }, [activeSessionId]);

  // Filtrado por búsqueda en Sidebar
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    sessions: filteredSessions,
    allSessions: sessions,
    activeSessionId,
    setActiveSessionId: (id: string) => {
      startTransition(() => {
        setActiveSessionId(id);
      });
    },
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
