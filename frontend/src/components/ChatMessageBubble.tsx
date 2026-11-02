/**
 * Simple Domain — Burbuja de Mensaje del Chat
 * Presentación limpia del mensaje sin dependencias de análisis o telemetría.
 */

import React, { useState } from 'react';
import { User, Cpu, Copy, Check } from 'lucide-react';
import { ChatMessage } from '../types/conversations';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onJobCompleted?: () => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <div className={`flex items-start space-x-3 font-mono text-xs ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded bg-cyber-card border border-cyber-yellow/40 flex items-center justify-center text-cyber-yellow shrink-0">
          <Cpu className="w-4 h-4" />
        </div>
      )}

      <div className={`max-w-2xl space-y-2 cut-corner-sm p-3.5 border ${
        isUser
          ? 'bg-cyber-yellow/10 border-cyber-yellow/40 text-white shadow-cyber-yellow-sm'
          : 'bg-cyber-surface/90 border-cyber-border text-cyber-text backdrop-blur-md'
      }`}>
        <div className="flex items-center justify-between text-[10px] text-cyber-muted border-b border-cyber-border/40 pb-1 mb-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold uppercase tracking-wider text-cyber-yellow">
              {isUser ? 'OPERADOR' : 'SIMPLE DOMAIN'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={handleCopy} className="p-1 hover:text-cyber-yellow text-cyber-muted cursor-pointer" title="Copiar texto">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="whitespace-pre-line leading-relaxed text-[11px] select-text cursor-text">
          {String(message.content || '')}
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded bg-cyber-card border border-cyber-border flex items-center justify-center text-cyber-muted shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default ChatMessageBubble;
