/**
 * Simple Domain — Hook useChat (Facade)
 * Principio de Responsabilidad Única y Composición sobre Herencia.
 * Coordina las sesiones conversacionales con el motor de streaming de RELIC.
 */

import { useState, useCallback } from 'react';
import { useChatSessions } from './useChatSessions';
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
      const currentMessages = sessionManager.getActiveMessages();
      const fullMessages = [...currentMessages, newUserMessage];

      sessionManager.updateActiveSessionMessages(
        [...fullMessages, { role: 'assistant', content: '' }],
        overrideSessionId
      );
      await startStream(fullMessages, overrideSessionId);
    },
    [sessionManager.getActiveMessages, sessionManager.updateActiveSessionMessages, isGenerating, startStream]
  );

  const regenerateLastMessage = useCallback(async () => {
    const currentMessages = sessionManager.getActiveMessages();
    if (isGenerating || currentMessages.length === 0) return;

    let lastUserIndex = -1;
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const messagesUpToUser = currentMessages.slice(0, lastUserIndex + 1);
    sessionManager.updateActiveSessionMessages([...messagesUpToUser, { role: 'assistant', content: '' }]);
    await startStream(messagesUpToUser);
  }, [isGenerating, sessionManager.getActiveMessages, sessionManager.updateActiveSessionMessages, startStream]);

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
