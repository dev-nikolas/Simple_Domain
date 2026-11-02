/**
 * Simple Domain — Vista Principal del Chat
 * Interfaz conversacional limpia enfocada en los mensajes y el envío de instrucciones.
 */

import React, { useEffect, useRef } from 'react';
import { CommandInput } from '../components/CommandInput';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { Conversation, ChatMessage } from '../types/conversations';
import { Message } from '../services/llmClient';
import { Plus, Cpu, Square } from 'lucide-react';
import { APP_NAME } from '../config/env';

interface HomeViewProps {
  activeConversation: Conversation | null;
  streamMessages: Message[];
  isGenerating: boolean;
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  onNewSession: () => void;
  onRefreshActive?: () => Promise<void>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  activeConversation,
  streamMessages,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onNewSession,
  onRefreshActive,
}) => {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [streamMessages, activeConversation?.messages]);

  const handleCommandSubmit = async (text: string) => {
    onSendMessage(text);
  };

  const handleFileSelected = async (_file: File) => {
    // Delegado a submitArchive en modo modular
  };

  // Mapeamos los mensajes de streaming al formato visual de ChatMessage
  const displayMessages: ChatMessage[] = streamMessages.map((m, idx) => ({
    id: `stream-${idx}`,
    conversation_id: activeConversation?.id || 'local-stream',
    role: (m.role === 'tool' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
    content: m.content,
    created_at: new Date().toISOString(),
  }));

  const hasMessages = displayMessages.length > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-cyber-bg relative font-mono select-none">
      {/* Fondo sutil cyberpunk */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="w-full h-full cyber-grid-bg opacity-40" />
      </div>

      <main ref={chatScrollRef} className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto">
        {!hasMessages ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-cyber-card border border-cyber-yellow/40 flex items-center justify-center cut-corner-sm mb-4 shadow-lg shadow-cyber-yellow/10">
              <Cpu className="w-8 h-8 text-cyber-yellow animate-pulse" />
            </div>
            <h1 className="font-tech text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">{APP_NAME}</h1>
            <p className="text-xs text-cyber-muted mt-2 leading-relaxed">
              Dolphin 3B Local Core · Streaming SSE activo · Historial persistente en navegador (localStorage).
            </p>
            <button
              onClick={onNewSession}
              className="mt-5 flex items-center space-x-1.5 px-4 py-2 bg-cyber-yellow/10 border border-cyber-yellow text-cyber-yellow text-xs font-bold cut-corner-sm hover:bg-cyber-yellow hover:text-black cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /><span>INICIAR NUEVA SESIÓN</span>
            </button>
          </div>
        ) : (
          <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-cyber-border pb-2 text-[10px] text-cyber-muted">
              <span className="font-bold text-cyber-yellow uppercase tracking-wider truncate mr-2">
                SESIÓN ACTIVA: {activeConversation?.title || 'DOLPHIN 3B CORE'}
              </span>
              <div className="flex items-center space-x-3 shrink-0">
                <span>{displayMessages.length} mensajes</span>
                {isGenerating && (
                  <button
                    onClick={onStopGeneration}
                    className="flex items-center space-x-1 px-2 py-0.5 border border-red-500/60 hover:border-red-500 text-red-400 hover:bg-red-500/10 cut-corner-xs transition-all cursor-pointer font-bold animate-pulse"
                    title="Detener inferencia"
                  >
                    <Square className="w-3 h-3 fill-current" /><span>DETENER</span>
                  </button>
                )}
                <button
                  onClick={onNewSession}
                  className="flex items-center space-x-1 px-2 py-0.5 border border-cyber-yellow/40 hover:border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow/10 cut-corner-xs transition-all cursor-pointer font-bold"
                  title="Nuevo chat"
                >
                  <Plus className="w-3 h-3" /><span>NUEVO CHAT</span>
                </button>
              </div>
            </div>

            {displayMessages.map((msg, idx) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                isGenerating={isGenerating && idx === displayMessages.length - 1}
                onJobCompleted={() => onRefreshActive && onRefreshActive()}
              />
            ))}
          </div>
        )}
      </main>

      <section className="w-full relative z-20 shrink-0 pb-3">
        <CommandInput
          onSubmitCommand={handleCommandSubmit}
          onFileSelected={handleFileSelected}
          isProcessing={isGenerating}
        />
      </section>
    </div>
  );
};

export default HomeView;
