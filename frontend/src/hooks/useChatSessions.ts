import { useState, useEffect, useCallback } from 'react';
import { Message } from '../services/llmClient';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const STORAGE_KEY = 'relic_chat_sessions';
const DEFAULT_SYSTEM_PROMPT = 'Eres un experto dev. Responde directo, sin preámbulos y solo con el código necesario.';

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error cargando sesiones desde localStorage:', e);
    }
    return [
      {
        id: Date.now().toString(),
        title: 'Nueva Conversación',
        messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
        updatedAt: Date.now()
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].id;
        }
      }
    } catch { /* fallback */ }
    return sessions.length > 0 ? sessions[0].id : null;
  });

  // Guardar en localStorage cada vez que cambian las sesiones
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Si no hay sesión activa y hay sesiones disponibles, seleccionar la primera
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  // 3. Crear nuevo chat
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nueva Conversación',
      messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  // 4. Eliminar chat
  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const fallbackSession: ChatSession = {
          id: Date.now().toString(),
          title: 'Nueva Conversación',
          messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
          updatedAt: Date.now()
        };
        setActiveSessionId(fallbackSession.id);
        return [fallbackSession];
      }
      return remaining;
    });

    setActiveSessionId(currentId => {
      if (currentId === id) {
        const remaining = sessions.filter(s => s.id !== id);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return currentId;
    });
  }, [sessions]);

  // 5. Actualizar mensajes de la sesión activa
  const updateActiveSessionMessages = useCallback((newMessages: Message[]) => {
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        // Generar título automático basado en el primer mensaje del usuario
        let title = session.title;
        if (title === 'Nueva Conversación' && newMessages.length > 1) {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          if (firstUserMsg && firstUserMsg.content.trim()) {
            title = firstUserMsg.content.trim().substring(0, 30) + '...';
          }
        }
        return { ...session, messages: newMessages, title, updatedAt: Date.now() };
      }
      return session;
    }));
  }, [activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || null;

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    activeMessages: activeSession?.messages || [],
    createNewSession,
    deleteSession,
    updateActiveSessionMessages
  };
}

