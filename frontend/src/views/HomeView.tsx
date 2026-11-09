/**
 * Simple Domain — Vista Principal del Chat (Cyberpunk HUD Layout)
 * Principio de Responsabilidad Única y Composición (SOLID).
 * Orquesta la barra de estado de sesión, QuickActionTiles, ChatFeed y CommandInput.
 */

import React from 'react';
import { CommandInput } from '../components/CommandInput';
import { Conversation, ChatMessage } from '../types/conversations';
import { Message } from '../types/relic';
import { QuickActionTiles } from './QuickActionTiles';
import { ChatFeed } from './ChatFeed';
import { Terminal, Square } from 'lucide-react';

interface HomeViewProps {
  activeConversation: Conversation | null;
  streamMessages: Message[];
  isGenerating: boolean;
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  onNewSession: () => void;
  onRegenerate?: () => void;
  activeCartridge?: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  activeConversation,
  streamMessages,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onNewSession,
  onRegenerate,
  activeCartridge = 'auto',
}) => {
  const displayMessages: ChatMessage[] = streamMessages.map((m, idx) => ({
    id: `msg-${idx}`,
    conversation_id: activeConversation?.id || 'local-stream',
    role: (m.role === 'tool' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
    content: m.content,
    created_at: new Date().toISOString(),
  }));

  const hasMessages = displayMessages.length > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#07080d] relative font-mono select-none">
      {/* Fondo ambiental gradiente magenta/ámbar (Imagen 2) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35 z-0">
        <div
          className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-red-600/10 via-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '9s' }}
        />
        <div className="w-full h-full cyber-grid-bg opacity-30" />
      </div>

      {/* Barra de telemetría de sesión estilo Cyberpunk 2077 */}
      <div className="px-4 sm:px-6 pt-3 relative z-10 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-cyber-border/70 pb-2 text-[10px] text-cyber-muted bg-black/20 px-3 py-1.5 rounded">
          <div className="flex items-center space-x-2 truncate mr-2">
            <Terminal className="w-3.5 h-3.5 text-cyber-yellow" />
            <span className="font-tech font-bold text-cyber-yellow uppercase tracking-wider">
              SESIÓN:
            </span>
            <span className="text-gray-300 font-bold truncate">
              {activeConversation?.title || 'CONVERSACIÓN LOCAL'}
            </span>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-cyan-400 font-semibold hidden sm:inline">
              ● Cartucho: {activeCartridge.toUpperCase()}
            </span>

            {isGenerating ? (
              <button
                onClick={onStopGeneration}
                className="flex items-center space-x-1 px-2.5 py-0.5 border border-red-500 text-red-400 hover:bg-red-500/20 rounded text-[10px] transition-all cursor-pointer font-bold animate-pulse"
                title="Detener inferencia de RELIC"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>INTERRUMPIR</span>
              </button>
            ) : (
              <button
                onClick={onNewSession}
                className="flex items-center space-x-1 px-2 py-0.5 border border-cyber-yellow/40 hover:border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow/10 rounded text-[10px] transition-all cursor-pointer font-bold"
                title="Nueva sesión"
              >
                <span>+ NUEVA</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal: QuickActionTiles o ChatFeed */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {!hasMessages ? (
          <QuickActionTiles onSendMessage={onSendMessage} />
        ) : (
          <ChatFeed
            messages={displayMessages}
            isGenerating={isGenerating}
            onRegenerate={onRegenerate}
          />
        )}
      </div>

      {/* Consola de comandos inferior */}
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
