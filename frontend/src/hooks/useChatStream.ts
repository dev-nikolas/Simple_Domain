/**
 * Simple Domain — Hook useChatStream
 * Principio de Responsabilidad Única (SRP): Control del ciclo de vida del streaming SSE.
 */

import { useState, useRef, useCallback } from 'react';
import { streamChatCompletion } from '../services/relicStreamService';
import { Message } from '../types/relic';
import { saveActiveSessionMessages } from '../services/sessionStorage';

interface UseChatStreamOptions {
  activeSessionId: string | null;
  activeCartridge: string;
  securityLevel: number;
  updateMessages: (messages: Message[], targetId?: string) => void;
}

export function useChatStream({
  activeSessionId,
  activeCartridge,
  securityLevel,
  updateMessages,
}: UseChatStreamOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (messagesForRelic: Message[], overrideSessionId?: string) => {
      const targetSessionId = overrideSessionId || activeSessionId || undefined;
      setIsGenerating(true);
      setChatError(null);
      abortControllerRef.current = new AbortController();
      let accumulated = '';

      try {
        await streamChatCompletion({
          messages: messagesForRelic,
          sessionId: targetSessionId,
          cartridge: activeCartridge,
          securityLevel,
          signal: abortControllerRef.current.signal,
          onUpdate: (token) => {
            accumulated += (token ?? '');
            updateMessages(
              [
                ...messagesForRelic,
                { role: 'assistant', content: accumulated },
              ],
              targetSessionId
            );
          },
        });

        const finalMessages: Message[] = [
          ...messagesForRelic,
          { role: 'assistant', content: accumulated },
        ];
        updateMessages(finalMessages, targetSessionId);

        if (targetSessionId) {
          saveActiveSessionMessages(targetSessionId, finalMessages);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('[useChatStream] Error en inferencia RELIC:', error);
          setChatError(error.message || 'Error conectando con RELIC');

          const fallbackMessages: Message[] = [
            ...messagesForRelic,
            {
              role: 'assistant',
              content: accumulated
                ? accumulated + `\n\n*(Error en streaming: ${error.message})*`
                : `[!] Error de RELIC: ${error.message}`,
            },
          ];
          updateMessages(fallbackMessages, targetSessionId);
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [activeSessionId, activeCartridge, securityLevel, updateMessages]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  return {
    isGenerating,
    chatError,
    setChatError,
    startStream,
    stopGeneration,
  };
}
