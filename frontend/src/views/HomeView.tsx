/**
 * Simple Domain — Vista Principal del Chat
 * Interfaz conversacional limpia enfocada en los mensajes y el envío de instrucciones.
 * Incluye auto-scroll inteligente (con botón flotante "Ir al final") y soporte para regenerar respuestas.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CommandInput } from '../components/CommandInput';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { Conversation, ChatMessage } from '../types/conversations';
import { Message } from '../services/llmClient';
import { Plus, Cpu, Square, Terminal, Code2, ArrowDown } from 'lucide-react';
import { APP_NAME } from '../config/env';

interface HomeViewProps {
  activeConversation: Conversation | null;
  streamMessages: Message[];
  isGenerating: boolean;
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  onNewSession: () => void;
  onRegenerate?: () => void;
  onRefreshActive?: () => Promise<void>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  activeConversation,
  streamMessages,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onNewSession,
  onRegenerate,
}) => {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);

  // Mapeamos los mensajes de la sesión activa al formato visual de ChatMessage
  const displayMessages: ChatMessage[] = streamMessages.map((m, idx) => ({
    id: `msg-${idx}`,
    conversation_id: activeConversation?.id || 'local-stream',
    role: (m.role === 'tool' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
    content: m.content,
    created_at: new Date().toISOString(),
  }));

  // Índice del último mensaje del asistente para ofrecer el botón "Regenerar"
  const lastAssistantIndex = displayMessages.map(m => m.role).lastIndexOf('assistant');

  // Detectar si el usuario está cerca del final del scroll
  const handleScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distanceToBottom <= 120);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setIsAtBottom(true);
    }
  }, []);

  // Auto-scroll inteligente: solo si el usuario ya está al fondo
  useEffect(() => {
    if (isAtBottom && chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: isGenerating ? 'auto' : 'smooth',
      });
    }
  }, [displayMessages, isGenerating, isAtBottom]);

  const hasMessages = displayMessages.length > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-cyber-bg relative font-mono select-none">
      {/* Fondo sutil cyberpunk */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '7s' }}
        />
        <div className="w-full h-full cyber-grid-bg opacity-40" />
      </div>

      <main
        ref={chatScrollRef}
        onScroll={handleScroll}
        className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto"
      >
        <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col">
          {/* Barra superior de estado de sesión */}
          <div className="flex items-center justify-between border-b border-cyber-border pb-2 text-[10px] text-cyber-muted mb-4 shrink-0">
            <span className="font-bold text-cyber-yellow uppercase tracking-wider truncate mr-2 flex items-center space-x-1.5">
              <Terminal className="w-3 h-3" />
              <span>SESIÓN: {activeConversation?.title || 'Nueva Conversación'}</span>
            </span>
            <div className="flex items-center space-x-3 shrink-0">
              <span>{displayMessages.length} msgs</span>
              {isGenerating && (
                <button
                  onClick={onStopGeneration}
                  className="flex items-center space-x-1 px-2 py-0.5 border border-red-500/60 hover:border-red-500 text-red-400 hover:bg-red-500/10 cut-corner-xs transition-all cursor-pointer font-bold animate-pulse"
                  title="Detener inferencia"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>DETENER</span>
                </button>
              )}
              <button
                onClick={onNewSession}
                className="flex items-center space-x-1 px-2 py-0.5 border border-cyber-yellow/40 hover:border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow/10 cut-corner-xs transition-all cursor-pointer font-bold"
                title="Nuevo chat"
              >
                <Plus className="w-3 h-3" />
                <span>NUEVO CHAT</span>
              </button>
            </div>
          </div>

          {!hasMessages ? (
            /* Pantalla inicial con atajos de inicio rápido */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 bg-cyber-card border border-cyber-yellow/40 flex items-center justify-center cut-corner-sm mb-4 shadow-lg shadow-cyber-yellow/10">
                <Cpu className="w-7 h-7 text-cyber-yellow animate-pulse" />
              </div>
              <h1 className="font-tech text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                {APP_NAME}
              </h1>
              <p className="text-xs text-cyber-muted mt-2 leading-relaxed">
                Dolphin 3B listo para programar. Escribe una instrucción abajo o pulsa una sugerencia rápida:
              </p>
              <div className="mt-5 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() =>
                    onSendMessage(
                      'Crea una función en Rust para calcular fibonacci recursivo e iterativo con pruebas unitarias'
                    )
                  }
                  className="flex items-center space-x-1.5 px-3 py-2 bg-cyber-surface border border-cyber-border hover:border-cyber-yellow text-cyber-muted hover:text-white text-[11px] cut-corner-xs transition-all cursor-pointer hover:bg-cyber-card"
                >
                  <Code2 className="w-3.5 h-3.5 text-cyber-yellow" />
                  <span>&gt; Fibonacci en Rust</span>
                </button>
                <button
                  onClick={() =>
                    onSendMessage(
                      'Escribe un ejemplo de streaming SSE en TypeScript usando TextDecoderStream'
                    )
                  }
                  className="flex items-center space-x-1.5 px-3 py-2 bg-cyber-surface border border-cyber-border hover:border-cyber-yellow text-cyber-muted hover:text-white text-[11px] cut-corner-xs transition-all cursor-pointer hover:bg-cyber-card"
                >
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>&gt; Streaming SSE en TS</span>
                </button>
              </div>
            </div>
          ) : (
            /* Lista de mensajes del chat */
            <div className="space-y-4">
              {displayMessages.map((msg, idx) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isGenerating={isGenerating && idx === displayMessages.length - 1}
                  isLastAssistantMessage={idx === lastAssistantIndex}
                  onRegenerate={onRegenerate}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Botón flotante "Ir al final" cuando el usuario sube el scroll */}
      {!isAtBottom && hasMessages && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={() => scrollToBottom(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-surface/95 border border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-black cut-corner-sm text-xs shadow-lg shadow-cyber-yellow/20 backdrop-blur-md transition-all font-bold cursor-pointer animate-bounce"
            title="Desplazarse al final del chat"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>IR AL FINAL</span>
          </button>
        </div>
      )}

      <section className="w-full relative z-20 shrink-0 pb-3">
        <CommandInput
          onSubmitCommand={onSendMessage}
          isProcessing={isGenerating}
        />
      </section>
    </div>
  );
};

export default HomeView;
