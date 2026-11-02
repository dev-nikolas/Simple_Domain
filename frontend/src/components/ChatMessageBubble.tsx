/**
 * Simple Domain — Burbuja de Mensaje del Chat
 * Renderizado profesional con Markdown, resaltado de sintaxis (VS Code Dark Plus)
 * y botón interactivo "Copiar código" en cada bloque de código.
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

// Sub-componente para bloques de código con cabecera y botón de copia
const CodeBlock: React.FC<{ language: string; codeString: string; props: any }> = ({
  language,
  codeString,
  props,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <div style={{ margin: '10px 0', border: '1px solid #333', borderRadius: '6px', overflow: 'hidden' }}>
      {/* Cabecera del bloque de código */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2d2d2d', padding: '4px 10px', fontSize: '12px', color: '#888' }}>
        <span>{language.toUpperCase()}</span>
        <button 
          onClick={handleCopy}
          style={{ background: 'transparent', border: 'none', color: '#eab308', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
          title="Copiar código al portapapeles"
        >
          {copied ? '✓ Copiado' : 'Copiar código'}
        </button>
      </div>
      {/* Resaltado de sintaxis */}
      <SyntaxHighlighter
        style={vscDarkPlus as any}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0 }}
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

// Componente para renderizar el contenido del mensaje
export const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          return !inline && match ? (
            <CodeBlock language={match[1]} codeString={codeString} props={props} />
          ) : (
            // Código en línea (inline)
            <code style={{ background: '#333', padding: '2px 4px', borderRadius: '4px', color: '#eab308' }} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

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
            <button onClick={handleCopy} className="p-1 hover:text-cyber-yellow text-cyber-muted cursor-pointer" title="Copiar texto completo">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* SI ES EL USUARIO, texto simple. SI ES EL LLM, renderizamos Markdown con SyntaxHighlighter */}
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

            <MessageContent content={message.content} />
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
