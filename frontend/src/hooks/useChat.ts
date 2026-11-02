import { useState, useRef, useCallback } from 'react';
import { streamChatCompletion, Message } from '../services/llmClient';
import { useChatSessions, DEFAULT_SYSTEM_PROMPT } from './useChatSessions';

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

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isGenerating) return;

      const newUserMessage: Message = { role: 'user', content: trimmed };
      const assistantPlaceholder: Message = { role: 'assistant', content: '' };

      // Historial base de la sesión activa asegurando system prompt
      const base = activeMessages.length > 0
        ? activeMessages
        : [{ role: 'system' as const, content: DEFAULT_SYSTEM_PROMPT }];

      const fullMessagesForLlm = [...base, newUserMessage];

      // Insertar de inmediato el mensaje de usuario y el placeholder del asistente en la sesión
      updateActiveSessionMessages(() => [...fullMessagesForLlm, assistantPlaceholder]);
      setIsGenerating(true);

      abortControllerRef.current = new AbortController();
      let accumulatedResponse = '';

      try {
        await streamChatCompletion({
          messages: fullMessagesForLlm,
          signal: abortControllerRef.current.signal,
          onUpdate: (token) => {
            accumulatedResponse += token;
            // Actualizar en tiempo real el último mensaje
            updateActiveSessionMessages((msgs) => {
              const copy = [...msgs];
              if (copy.length > 0) {
                copy[copy.length - 1] = {
                  role: 'assistant',
                  content: accumulatedResponse,
                };
              }
              return copy;
            });
          },
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error en inferencia LLM:', error);
          updateActiveSessionMessages((msgs) => {
            const copy = [...msgs];
            if (copy.length > 0) {
              copy[copy.length - 1] = {
                role: 'assistant',
                content: accumulatedResponse
                  ? accumulatedResponse + `\n\n[Error en streaming: ${error.message}]`
                  : `[Error conectando al motor LLM: ${error.message}]`,
              };
            }
            return copy;
          });
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [activeMessages, isGenerating, updateActiveSessionMessages]
  );

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
    messages: (activeSession?.messages || []).filter((m) => m.role !== 'system'),
    rawMessages: activeSession?.messages || [],
    isGenerating,
    sendMessage,
    stopGeneration,
    createNewSession,
    deleteSession,
  };
}

export { useChatSessions };
