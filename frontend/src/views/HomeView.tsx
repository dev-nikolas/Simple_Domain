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
import { Terminal } from 'lucide-react';

interface HomeViewProps {
  activeConversation: Conversation | null;
  streamMessages: Message[];
  isGenerating: boolean;
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  onRegenerate?: () => void;
  isGatewayOffline?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  activeConversation,
  streamMessages,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onRegenerate,
  isGatewayOffline = false,
}) => {
  const displayMessages: ChatMessage[] = streamMessages.map((m, idx) => ({
    id: `msg-${idx}`,
    conversation_id: activeConversation?.id || 'relic-stream',
    role: (m.role === 'tool' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
    content: m.content,
    created_at: new Date().toISOString(),
  }));

  const hasMessages = displayMessages.length > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#050508] relative font-mono">
      {/* Fondo ambiental sutil en rojo oscuro y rejilla */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25 z-0">
        <div
          className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-red-600/10 via-red-950/15 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '9s' }}
        />
        <div className="w-full h-full cyber-grid-bg opacity-30" />
      </div>

      {/* Barra de telemetría de sesión visible solo cuando hay mensajes activos */}
      {hasMessages && (
        <div className="px-3 sm:px-6 pt-2.5 relative z-10 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-[#232736] pb-2 text-[10px] text-gray-400 bg-black/30 px-3 py-1.5 rounded">
            <div className="flex items-center space-x-2 truncate mr-2">
              <Terminal className="w-3.5 h-3.5 text-cyber-red" />
              <span className="font-tech font-bold text-cyber-red uppercase tracking-wider">
                SESIÓN:
              </span>
              <span className="text-gray-200 font-bold truncate">
                {activeConversation?.title || 'Sesión Activa'}
              </span>
            </div>

            {isGenerating && (
              <span className="text-[10px] text-cyber-red font-mono tracking-wider">
                GENERANDO...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Contenido principal: QuickActionTiles o ChatFeed */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {!hasMessages ? (
          <QuickActionTiles />
        ) : (
          <ChatFeed
            messages={displayMessages}
            isGenerating={isGenerating}
            onRegenerate={onRegenerate}
          />
        )}
      </div>

      {/* Consola de comandos inferior */}
      <section className="w-full relative z-20 shrink-0 pb-2">
        <CommandInput
          onSubmitCommand={onSendMessage}
          onStopGeneration={onStopGeneration}
          isProcessing={isGenerating}
          isGatewayOffline={isGatewayOffline}
        />
      </section>
    </div>
  );
};

export default HomeView;
