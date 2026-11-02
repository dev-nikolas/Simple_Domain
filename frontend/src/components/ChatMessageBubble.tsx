/**
 * Simple Domain — Burbuja de Mensaje del Chat
 * Renderizado profesional con Markdown, resaltado de sintaxis (VS Code Dark Plus) e indicador de Prefill/Pensando.
 */

import React, { useState } from 'react';
import { User, Cpu, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage } from '../types/conversations';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onJobCompleted?: () => void;
  isGenerating?: boolean;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, isGenerating }) => {
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

      <div className={`max-w-2xl w-full space-y-2 cut-corner-sm p-3.5 border ${
        isUser
          ? 'bg-cyber-yellow/10 border-cyber-yellow/40 text-white shadow-cyber-yellow-sm'
          : 'bg-cyber-surface/90 border-cyber-border text-cyber-text backdrop-blur-md'
      }`}>
        <div className="flex items-center justify-between text-[10px] text-cyber-muted border-b border-cyber-border/40 pb-1 mb-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold uppercase tracking-wider text-cyber-yellow">
              {isUser ? 'OPERADOR' : 'DOLPHIN 3B'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={handleCopy} className="p-1 hover:text-cyber-yellow text-cyber-muted cursor-pointer" title="Copiar texto">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* SI ES EL USUARIO, texto simple. SI ES EL LLM, renderizamos Markdown */}
        {isUser ? (
          <div className="whitespace-pre-line leading-relaxed text-[11px] select-text cursor-text">
            {message.content}
          </div>
        ) : (
          <div className="space-y-1 text-[11px] leading-relaxed select-text cursor-text">
            {/* Indicador de carga si está generando pero aún no hay letras (Prefill Lag) */}
            {isGenerating && (!message.content || message.content.trim() === '') && (
              <div className="flex items-center space-x-2 text-cyber-yellow animate-pulse py-1">
                <span>⏳</span>
                <span className="font-bold tracking-wider">Pensando...</span>
              </div>
            )}

            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="my-2 rounded overflow-hidden border border-cyber-border/60">
                      <div className="bg-black/60 px-3 py-1 text-[10px] text-cyber-yellow font-bold uppercase border-b border-cyber-border/40 flex justify-between items-center">
                        <span>{match[1]}</span>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, padding: '12px', background: '#1e1e1e', fontSize: '11px' }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-white/10 text-cyber-yellow px-1.5 py-0.5 rounded text-[10px] font-mono border border-cyber-border/40" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
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
