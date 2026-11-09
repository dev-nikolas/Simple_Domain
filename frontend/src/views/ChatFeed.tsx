/**
 * Simple Domain — Contenedor ChatFeed
 * Principio de Responsabilidad Única (SRP): Renderizado de la lista de mensajes y auto-scroll.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { ChatMessage } from '../types/conversations';
import { ChatMessageBubble } from '../components/ChatMessageBubble';

interface ChatFeedProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onRegenerate?: () => void;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  isGenerating,
  onRegenerate,
}) => {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);

  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf('assistant');

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

  useEffect(() => {
    if (isAtBottom && chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: isGenerating ? 'auto' : 'smooth',
      });
    }
  }, [messages, isGenerating, isAtBottom]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div
        ref={chatScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-2 space-y-4"
      >
        <div className="max-w-4xl w-full mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isGenerating={isGenerating && idx === messages.length - 1}
              isLastAssistantMessage={idx === lastAssistantIndex}
              onRegenerate={onRegenerate}
            />
          ))}
        </div>
      </div>

      {!isAtBottom && messages.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={() => scrollToBottom(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0e101a]/95 border border-cyber-red text-red-200 hover:bg-cyber-red hover:text-white rounded-lg text-xs shadow-xl shadow-cyber-red/30 backdrop-blur-md transition-all font-bold cursor-pointer font-mono"
            title="Ir al final del chat"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>IR AL FINAL</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatFeed;
