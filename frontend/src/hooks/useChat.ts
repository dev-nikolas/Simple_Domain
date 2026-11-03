// src/hooks/useChat.ts
import { useState, useRef, useCallback } from 'react';
import { streamChatCompletion, Message } from '../services/llmClient';
import { useChatSessions, DEFAULT_SYSTEM_PROMPT } from './useChatSessions';
import { sessionsApi } from '../services/sessionsApi';

export function useChat() {
  const {
    sessions,
    allSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    activeMessages,
    isLoading,
    error: sessionsError,
    searchQuery,
    setSearchQuery,
    createNewSession,
    renameSession,
    deleteSession,
    updateActiveSessionMessages,
    refreshSessions,
  } = useChatSessions();

  const [isGenerating, setIsGenerating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isGenerating) return;

      setChatError(null);
      const newUserMessage: Message = { role: 'user', content: trimmed };
      const assistantPlaceholder: Message = { role: 'assistant', content: '' };

      const systemPrompt: Message = {
        role: 'system',
        content: DEFAULT_SYSTEM_PROMPT,
      };

      const base = activeMessages.some((m) => m.role === 'system')
        ? activeMessages
        : [systemPrompt, ...activeMessages];

      const fullMessagesForLlm = [...base, newUserMessage];
      const initialWithPlaceholder = [...fullMessagesForLlm, assistantPlaceholder];

      // Insertar de inmediato en UI
      updateActiveSessionMessages(initialWithPlaceholder);
      setIsGenerating(true);

      abortControllerRef.current = new AbortController();
      let accumulatedResponse = '';

      try {
        await streamChatCompletion({
          messages: fullMessagesForLlm,
          sessionId: activeSessionId || undefined,
          signal: abortControllerRef.current.signal,
          onUpdate: (token) => {
            accumulatedResponse += token;
            updateActiveSessionMessages([
              ...fullMessagesForLlm,
              { role: 'assistant', content: accumulatedResponse },
            ]);
          },
        });

        const finalMessages: Message[] = [
          ...fullMessagesForLlm,
          { role: 'assistant', content: accumulatedResponse },
        ];
        updateActiveSessionMessages(finalMessages);

        // Auto-Save asíncrono en localStorage inmediatamente al interceptar la señal [DONE]
        if (activeSessionId) {
          try {
            localStorage.setItem(`relic_session_${activeSessionId}`, JSON.stringify(finalMessages));
            localStorage.setItem('relic_active_session_id', activeSessionId);
          } catch (e) {
            console.warn('[Auto-Save] Error guardando en localStorage:', e);
          }

          try {
            await sessionsApi.syncMessages(activeSessionId, finalMessages);
          } catch {
            // Error de sincronización silencioso
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('[useChat] Error en inferencia:', error);
          setChatError(error.message || 'Error conectando con el motor LLM');

          const fallbackMessages: Message[] = [
            ...fullMessagesForLlm,
            {
              role: 'assistant',
              content: accumulatedResponse
                ? accumulatedResponse + `\n\n*(Error durante la transmisión: ${error.message})*`
                : `⚠️ No se pudo obtener respuesta del motor LLM: ${error.message}`,
            },
          ];
          updateActiveSessionMessages(fallbackMessages);
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [activeMessages, isGenerating, activeSessionId, updateActiveSessionMessages]
  );

  // Regenerar la última respuesta del asistente
  const regenerateLastMessage = useCallback(async () => {
    if (isGenerating || activeMessages.length === 0) return;

    // Buscar el último mensaje del usuario
    let lastUserIndex = -1;
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const messagesUpToUser = activeMessages.slice(0, lastUserIndex + 1);

    // Placeholder vacío para asistente
    updateActiveSessionMessages([...messagesUpToUser, { role: 'assistant', content: '' }]);
    setIsGenerating(true);
    setChatError(null);

    abortControllerRef.current = new AbortController();
    let accumulatedResponse = '';

    try {
      await streamChatCompletion({
        messages: messagesUpToUser,
        sessionId: activeSessionId || undefined,
        signal: abortControllerRef.current.signal,
        onUpdate: (token) => {
          accumulatedResponse += token;
          updateActiveSessionMessages([
            ...messagesUpToUser,
            { role: 'assistant', content: accumulatedResponse },
          ]);
        },
      });

      const finalMessages: Message[] = [
        ...messagesUpToUser,
        { role: 'assistant', content: accumulatedResponse },
      ];
      updateActiveSessionMessages(finalMessages);

      if (activeSessionId) {
        try {
          localStorage.setItem(`relic_session_${activeSessionId}`, JSON.stringify(finalMessages));
          localStorage.setItem('relic_active_session_id', activeSessionId);
        } catch (e) {
          console.warn('[Auto-Save] Error guardando en localStorage:', e);
        }

        try {
          await sessionsApi.syncMessages(activeSessionId, finalMessages);
        } catch {
          // Error silencioso
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setChatError(error.message || 'Error regenerando mensaje');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [isGenerating, activeMessages, activeSessionId, updateActiveSessionMessages]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  return {
    sessions,
    allSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    messages: (activeSession?.messages || []).filter((m) => m.role !== 'system'),
    rawMessages: activeSession?.messages || [],
    isLoading,
    isGenerating,
    error: chatError || sessionsError,
    searchQuery,
    setSearchQuery,
    sendMessage,
    regenerateLastMessage,
    stopGeneration,
    createNewSession,
    renameSession,
    deleteSession,
    refreshSessions,
  };
}

export default useChat;
