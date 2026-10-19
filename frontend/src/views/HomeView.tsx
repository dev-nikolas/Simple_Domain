/**
 * Simple Domain — Vista Home (Espacio Conversacional, Ingesta y Telemetría)
 */

import React, { useEffect, useRef, useState } from 'react';
import { CoreVisualization } from '../components/CoreVisualization';
import { CommandInput } from '../components/CommandInput';
import { StatusBar } from '../components/StatusBar';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { Conversation } from '../types/conversations';
import { modularApi } from '../services/modularApi';

interface HomeViewProps {
  isOnline: boolean;
  activeConversation: Conversation | null;
  onRefreshActive: () => Promise<void>;
  onNewSession: () => Promise<void>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  isOnline,
  activeConversation,
  onRefreshActive,
  onNewSession,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleFileSelected = async (file: File) => {
    try {
      setIsProcessing(true);
      let targetId = activeConversation?.id;
      if (!targetId) {
        await onNewSession();
        const convs = await modularApi.getConversations();
        targetId = convs[0]?.id;
      }
      if (targetId) {
        await modularApi.submitArchive(file, targetId);
        await onRefreshActive();
      }
    } catch {
      // Error submit
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommandSubmit = async (text: string) => {
    try {
      let targetId = activeConversation?.id;
      if (!targetId) {
        await onNewSession();
        const convs = await modularApi.getConversations();
        targetId = convs[0]?.id;
      }
      if (targetId) {
        await modularApi.sendMessage(targetId, text, 'user');
        await onRefreshActive();
      }
    } catch {
      // Error message
    }
  };

  const hasMessages = Boolean(activeConversation?.messages && activeConversation.messages.length > 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-cyber-bg relative font-mono select-none">
      <main
        ref={chatScrollRef}
        className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto"
      >
        {!hasMessages ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <CoreVisualization />
            <div className="text-[11px] text-cyber-muted mt-2 text-center max-w-md">
              Abre el menú lateral para ver tus sesiones o pulsa <span className="text-cyber-yellow font-bold">[ + ]</span> para adjuntar un dataset CSV o JSON.
            </div>
            <button
              onClick={onNewSession}
              className="mt-3 px-3 py-1 bg-cyber-yellow/10 border border-cyber-yellow/50 hover:border-cyber-yellow text-cyber-yellow text-[11px] font-bold cut-corner-sm cursor-pointer transition-all hover:bg-cyber-yellow/20"
            >
              + NUEVO CHAT
            </button>
          </div>
        ) : (
          <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-cyber-border pb-2 text-[10px] text-cyber-muted">
              <span className="font-bold text-cyber-yellow uppercase tracking-wider truncate mr-2">
                SESIÓN ACTIVA: {activeConversation?.title}
              </span>
              <div className="flex items-center space-x-3 shrink-0">
                <span>{activeConversation?.messages.length} mensajes</span>
                <button
                  onClick={onNewSession}
                  className="px-2 py-0.5 border border-cyber-yellow/40 hover:border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow/10 cut-corner-sm transition-all cursor-pointer font-bold"
                  title="Crear un nuevo chat"
                >
                  + NUEVO CHAT
                </button>
              </div>
            </div>

            {activeConversation?.messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} onJobCompleted={() => onRefreshActive()} />
            ))}
          </div>
        )}
      </main>

      <section className="w-full relative z-20 shrink-0">
        <CommandInput
          onSubmitCommand={handleCommandSubmit}
          onFileSelected={handleFileSelected}
          isProcessing={isProcessing}
        />
      </section>

      <StatusBar isOnline={isOnline} />
    </div>
  );
};
