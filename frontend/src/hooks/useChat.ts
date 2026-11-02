// src/hooks/useChat.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { streamChatCompletion, Message } from '../services/llmClient';
import { useChatSessions } from './useChatSessions';

export function useChat() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    activeMessages,
    createNewSession,
    deleteSession,
    updateActiveSessionMessages,
  } = useChatSessions();

  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mensajes locales activos para reflejar el streaming en vivo sin lag de renderizado
  const [liveMessages, setLiveMessages] = useState<Message[]>(activeMessages);

  // Sincronizar mensajes en vivo cuando cambia la sesión activa o los mensajes de fondo
  useEffect(() => {
    if (!isGenerating) {
      setLiveMessages(activeMessages);
    }
  }, [activeSessionId, activeMessages, isGenerating]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating) return;

    // 1. Mensajes previos de esta sesión (asegurando el system prompt si no estuviera)
    const baseMessages = liveMessages.length > 0
      ? liveMessages
      : [{ role: 'system' as const, content: 'Eres un experto dev. Responde directo, sin preámbulos y solo con el código necesario.' }];

    // 2. Preparar el nuevo mensaje de usuario y el placeholder del asistente
    const newUserMessage: Message = { role: 'user', content };
    const assistantPlaceholder: Message = { role: 'assistant', content: '' };

    const updatedWithUser = [...baseMessages, newUserMessage];
    const updatedWithPlaceholder = [...updatedWithUser, assistantPlaceholder];

    setLiveMessages(updatedWithPlaceholder);
    updateActiveSessionMessages(updatedWithPlaceholder);
    setIsGenerating(true);

    abortControllerRef.current = new AbortController();
    let accumulatedResponse = '';

    try {
      await streamChatCompletion({
        // Pasamos el historial completo sin el placeholder vacío
        messages: updatedWithUser,
        signal: abortControllerRef.current.signal,
        onUpdate: (token) => {
          accumulatedResponse += token;

          setLiveMessages(current => {
            const next = [...current];
            if (next.length > 0) {
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: accumulatedResponse
              };
            }
            return next;
          });
        }
      });

      // Al terminar con éxito, persistir la respuesta acumulada en la sesión
      const finalMessages = [...updatedWithUser, { role: 'assistant' as const, content: accumulatedResponse }];
      setLiveMessages(finalMessages);
      updateActiveSessionMessages(finalMessages);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error en inferencia:', error);
      }
      if (accumulatedResponse) {
        const partialMessages = [...updatedWithUser, { role: 'assistant' as const, content: accumulatedResponse }];
        setLiveMessages(partialMessages);
        updateActiveSessionMessages(partialMessages);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [liveMessages, isGenerating, updateActiveSessionMessages]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    messages: liveMessages.filter(m => m.role !== 'system'), // Ocultar system prompt de la UI
    rawMessages: liveMessages,
    isGenerating,
    sendMessage,
    stopGeneration,
    createNewSession,
    deleteSession,
  };
}
export { useChatSessions };
