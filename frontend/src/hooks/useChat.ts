/**
 * Simple Domain — Hook useChat (Facade)
 * Principio de Responsabilidad Única y Composición sobre Herencia.
 * Coordina las sesiones conversacionales con el motor de streaming de RELIC.
 */

import { useState, useCallback } from 'react';
import { useChatSessions, DEFAULT_SYSTEM_PROMPT } from './useChatSessions';
import { useChatStream } from './useChatStream';
import { Message } from '../types/relic';

export function useChat() {
  const sessionManager = useChatSessions();
  const [activeCartridge, setActiveCartridge] = useState<string>('auto');
  const [securityLevel, setSecurityLevel] = useState<number>(2);

  const {
    isGenerating,
    chatError,
    startStream,
    stopGeneration,
  } = useChatStream({
    activeSessionId: sessionManager.activeSessionId,
    activeCartridge,
    securityLevel,
    updateMessages: sessionManager.updateActiveSessionMessages,
  });

  const sendMessage = useCallback(
    async (content: string, overrideSessionId?: string) => {
      const trimmed = content.trim();
      if (!trimmed || isGenerating) return;

      const newUserMessage: Message = { role: 'user', content: trimmed };
      const systemPrompt: Message = { role: 'system', content: DEFAULT_SYSTEM_PROMPT };

      const base = sessionManager.activeMessages.some((m) => m.role === 'system')
        ? sessionManager.activeMessages
        : [systemPrompt, ...sessionManager.activeMessages];

      const fullMessages = [...base, newUserMessage];
      sessionManager.updateActiveSessionMessages([...fullMessages, { role: 'assistant', content: '' }]);
      await startStream(fullMessages, overrideSessionId);
    },
    [sessionManager.activeMessages, sessionManager.updateActiveSessionMessages, isGenerating, startStream]
  );

  const regenerateLastMessage = useCallback(async () => {
    if (isGenerating || sessionManager.activeMessages.length === 0) return;

    let lastUserIndex = -1;
    for (let i = sessionManager.activeMessages.length - 1; i >= 0; i--) {
      if (sessionManager.activeMessages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const messagesUpToUser = sessionManager.activeMessages.slice(0, lastUserIndex + 1);
    sessionManager.updateActiveSessionMessages([...messagesUpToUser, { role: 'assistant', content: '' }]);
    await startStream(messagesUpToUser);
  }, [isGenerating, sessionManager.activeMessages, sessionManager.updateActiveSessionMessages, startStream]);

  return {
    ...sessionManager,
    messages: (sessionManager.activeSession?.messages || []).filter((m) => m.role !== 'system'),
    rawMessages: sessionManager.activeSession?.messages || [],
    isGenerating,
    error: chatError || sessionManager.error,
    activeCartridge,
    setActiveCartridge,
    securityLevel,
    setSecurityLevel,
    sendMessage,
    regenerateLastMessage,
    stopGeneration,
  };
}

export default useChat;
