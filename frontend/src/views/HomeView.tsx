/**
 * Simple Domain — Vista Home (Espacio Conversacional Minimalista con Animación de Fondo)
 * Menos de 180 líneas.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CommandInput } from '../components/CommandInput';
import { StatusBar } from '../components/StatusBar';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { Conversation } from '../types/conversations';
import { modularApi } from '../services/modularApi';
import { Plus, Cpu } from 'lucide-react';
import { APP_NAME } from '../config/env';

interface HomeViewProps {
  isOnline: boolean;
  activeConversation: Conversation | null;
  onRefreshActive: () => Promise<void>;
  onNewSession: () => Promise<void>;
  isSandboxMode?: boolean;
  onToggleSandboxMode?: () => void;
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
    } catch { /* submit err */ } finally { setIsProcessing(false); }
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
    } catch { /* msg err */ }
  };

  const hasMessages = Boolean(activeConversation?.messages && activeConversation.messages.length > 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-cyber-bg relative font-mono select-none">
      {/* Animación liviana y minimalista de fondo */}
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
              Asistente de Razonamiento Lógico Desacoplado · Consulta o adjunta un dataset para análisis formal.
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
                SESIÓN ACTIVA: {activeConversation?.title}
              </span>
              <div className="flex items-center space-x-3 shrink-0">
                <span>{activeConversation?.messages.length} mensajes</span>
                <button
                  onClick={onNewSession}
                  className="flex items-center space-x-1 px-2 py-0.5 border border-cyber-yellow/40 hover:border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow/10 cut-corner-xs transition-all cursor-pointer font-bold"
                  title="Nuevo chat"
                >
                  <Plus className="w-3 h-3" /><span>NUEVO CHAT</span>
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
