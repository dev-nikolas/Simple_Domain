import { useState, useEffect, useCallback } from 'react';
import { Message } from '../services/llmClient';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const STORAGE_KEY = 'relic_chat_sessions';
export const DEFAULT_SYSTEM_PROMPT = 'Eres un experto dev. Responde directo, sin preámbulos y solo con el código necesario.';

function loadInitialSessions(): ChatSession[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error leyendo sesiones de localStorage:', e);
  }
  return [
    {
      id: Date.now().toString(),
      title: 'Nueva Conversación',
      messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
      updatedAt: Date.now(),
    },
  ];
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>(loadInitialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const initial = loadInitialSessions();
    return initial[0].id;
  });

  // Guardar en localStorage cada vez que sessions cambie
  useEffect(() => {
    try {
      if (sessions.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      }
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }, [sessions]);

  // Si activeSessionId no existe en sessions, seleccionar la primera
  useEffect(() => {
    if (!sessions.some(s => s.id === activeSessionId) && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  // Crear nuevo chat
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nueva Conversación',
      messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  // Eliminar chat
  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const fallback: ChatSession = {
          id: Date.now().toString(),
          title: 'Nueva Conversación',
          messages: [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }],
          updatedAt: Date.now(),
        };
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      return remaining;
    });

    setActiveSessionId(curr => {
      if (curr === id) {
        const remaining = sessions.filter(s => s.id !== id);
        return remaining.length > 0 ? remaining[0].id : '';
      }
      return curr;
    });
  }, [sessions]);

  // Actualizar mensajes de la sesión activa
  const updateActiveSessionMessages = useCallback((updater: (prevMessages: Message[]) => Message[]) => {
    setSessions(prev =>
      prev.map(session => {
        if (session.id === activeSessionId) {
          const newMessages = updater(session.messages);
          let title = session.title;
          if (title === 'Nueva Conversación' && newMessages.length > 1) {
            const firstUserMsg = newMessages.find(m => m.role === 'user');
            if (firstUserMsg && firstUserMsg.content.trim()) {
              title = firstUserMsg.content.trim().substring(0, 30) + '...';
            }
          }
          return {
            ...session,
            messages: newMessages,
            title,
            updatedAt: Date.now(),
          };
        }
        return session;
      })
    );
  }, [activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    activeMessages: activeSession?.messages || [],
    createNewSession,
    deleteSession,
    updateActiveSessionMessages,
  };
}
