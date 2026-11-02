/**
 * Simple Domain — Burbuja de Mensaje Profesional (Estilo ChatGPT / Claude)
 * Soporte GFM completo (tablas, checklists), sanitización de enlaces, cierre virtual
 * de fences incompletos durante streaming, resaltado Prism y acciones por mensaje.
 */

import React, { useState, useMemo } from 'react';
import { User, Cpu, Copy, Check, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage } from '../types/conversations';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isGenerating?: boolean;
  isLastAssistantMessage?: boolean;
  onRegenerate?: () => void;
}

// Cierra fences ``` de markdown sin cerrar para evitar layout jumps durante el streaming
export function sanitizeStreamingMarkdown(content: string, isStreaming: boolean): string {
  if (!isStreaming || !content) return content;
  const matches = content.match(/```/g);
  const count = matches ? matches.length : 0;
  if (count % 2 !== 0) {
    return content + '\n```';
  }
  return content;
}

// Sub-componente para bloques de código
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

  const cleanLang = (language || 'text').toLowerCase();

  return (
    <div className="my-3 rounded-md overflow-hidden border border-cyber-border/70 bg-[#1e1e1e] shadow-md group">
      {/* Cabecera del bloque */}
      <div className="flex items-center justify-between bg-[#2d2d2d] px-3.5 py-1.5 text-[11px] font-mono text-cyber-muted border-b border-cyber-border/40 select-none">
        <span className="font-bold uppercase tracking-wider text-cyber-yellow/90">
          {cleanLang}
        </span>
        <button
          onClick={handleCopy}
          aria-label={`Copiar código ${cleanLang}`}
          className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-cyber-muted hover:text-cyber-yellow hover:bg-white/5 transition-all cursor-pointer font-sans text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar código</span>
            </>
          )}
        </button>
      </div>

      {/* Contenedor de sintaxis con scroll horizontal */}
      <div className="overflow-x-auto text-[11.5px] leading-relaxed">
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={cleanLang}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '14px',
            background: 'transparent',
            fontSize: '11.5px',
            lineHeight: '1.6',
          }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// Componente para renderizar Markdown con soporte GFM y enlaces seguros
export const MessageMarkdown: React.FC<{ content: string; isStreaming?: boolean }> = ({
  content,
  isStreaming = false,
}) => {
  const preparedContent = useMemo(
    () => sanitizeStreamingMarkdown(content, isStreaming),
    [content, isStreaming]
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Bloques de código y código inline
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');

          return !inline && match ? (
            <CodeBlock language={match[1]} codeString={codeString} props={props} />
          ) : (
            <code
              className="bg-white/10 text-cyber-yellow px-1.5 py-0.5 rounded text-[11px] font-mono border border-cyber-border/40"
              {...props}
            >
              {children}
            </code>
          );
        },

        // Enlaces seguros (anti-XSS y apertura externa)
        a({ href, children, ...props }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline hover:text-cyan-300 font-medium break-all"
              {...props}
            >
              {children}
            </a>
          );
        },

        // Tablas completas GFM
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3 border border-cyber-border/60 rounded">
              <table className="min-w-full divide-y divide-cyber-border/60 text-left text-xs">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="bg-cyber-card px-3 py-2 font-bold text-cyber-yellow uppercase tracking-wider text-[10px] border-b border-cyber-border">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-3 py-2 border-b border-cyber-border/30 text-cyber-text text-[11px]">
              {children}
            </td>
          );
        },

        // Citas (Blockquotes)
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-cyber-yellow/60 pl-3 my-2 text-cyber-muted italic text-[11px]">
              {children}
            </blockquote>
          );
        },

        // Listas ordenadas y desordenadas
        ul({ children }) {
          return <ul className="list-disc list-outside pl-5 my-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-outside pl-5 my-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },

        // Párrafos con espaciado natural
        p({ children }) {
          return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>;
        },
      }}
    >
      {preparedContent}
    </ReactMarkdown>
  );
};

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = React.memo(
  ({ message, isGenerating = false, isLastAssistantMessage = false, onRegenerate }) => {
    const isUser = message.role === 'user';
    const [copiedAll, setCopiedAll] = useState<boolean>(false);

    const hasContent = Boolean(message.content && message.content.trim() !== '');
    const isThinking = isGenerating && !hasContent;
    const isStreaming = isGenerating && hasContent;

    const handleCopyAll = async () => {
      if (!message.content) return;
      try {
        await navigator.clipboard.writeText(message.content);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      } catch { /* fallback */ }
    };

    return (
      <article
        aria-live={isGenerating ? 'polite' : 'off'}
        className={`flex items-start space-x-3 font-mono text-xs transition-opacity duration-200 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {!isUser && (
          <div
            className={`w-7 h-7 rounded bg-cyber-card border flex items-center justify-center shrink-0 transition-colors ${
              isGenerating
                ? 'border-cyber-yellow text-cyber-yellow shadow-sm shadow-cyber-yellow/30'
                : 'border-cyber-yellow/40 text-cyber-yellow'
            }`}
          >
            <Cpu className={`w-4 h-4 ${isThinking ? 'animate-spin' : isStreaming ? 'animate-pulse' : ''}`} />
          </div>
        )}

        <div
          className={`max-w-3xl w-full space-y-2 cut-corner-sm p-4 border transition-all ${
            isUser
              ? 'bg-cyber-yellow/10 border-cyber-yellow/50 text-white shadow-cyber-yellow-sm ml-8'
              : isGenerating
                ? 'bg-cyber-surface/95 border-cyber-yellow/60 text-cyber-text backdrop-blur-md shadow-sm shadow-cyber-yellow/10 mr-8'
                : 'bg-cyber-surface/90 border-cyber-border text-cyber-text backdrop-blur-md mr-8'
          }`}
        >
          {/* Cabecera del Mensaje */}
          <div className="flex items-center justify-between text-[10px] text-cyber-muted border-b border-cyber-border/40 pb-1.5 mb-2 select-none">
            <div className="flex items-center space-x-2">
              {isUser ? (
                <span className="font-bold uppercase tracking-wider text-cyber-yellow">OPERADOR</span>
              ) : isThinking ? (
                <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-cyber-yellow animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyber-yellow inline-block animate-ping" />
                  <span>DOLPHIN 3B · PENSANDO</span>
                </span>
              ) : isStreaming ? (
                <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span>DOLPHIN 3B · ESCRIBIENDO</span>
                </span>
              ) : (
                <span className="font-bold uppercase tracking-wider text-cyber-yellow">DOLPHIN 3B</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {hasContent && (
                <div className="flex items-center space-x-1 pl-2 border-l border-cyber-border/40">
                  <button
                    onClick={handleCopyAll}
                    aria-label="Copiar respuesta completa"
                    className="p-1 hover:text-cyber-yellow text-cyber-muted cursor-pointer transition-colors"
                    title="Copiar texto completo"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {!isUser && !isGenerating && isLastAssistantMessage && onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      aria-label="Regenerar respuesta"
                      className="p-1 hover:text-cyan-400 text-cyber-muted cursor-pointer transition-colors"
                      title="Regenerar respuesta"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cuerpo del Mensaje */}
          {isUser ? (
            <div className="whitespace-pre-line leading-relaxed text-[12px] select-text cursor-text">
              {message.content}
            </div>
          ) : (
            <div className="text-[12px] leading-relaxed select-text cursor-text">
              {/* Esqueleto Thinking durante Prefill Lag */}
              {isThinking && (
                <div className="py-3 px-3.5 bg-cyber-card/70 border border-cyber-yellow/40 cut-corner-sm space-y-2">
                  <div className="flex items-center space-x-2 text-cyber-yellow text-[11px] font-bold">
                    <Cpu className="w-3.5 h-3.5 animate-spin" />
                    <span className="tracking-wider">DOLPHIN 3B · COMPUTANDO INFERENCIA AVX2...</span>
                  </div>
                  <div className="flex items-center space-x-2 text-cyber-muted text-[10px]">
                    <div className="flex space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyber-yellow inline-block animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyber-yellow inline-block animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyber-yellow inline-block animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="font-mono text-cyber-muted/80">Generando tokens en CPU</span>
                  </div>
                </div>
              )}

              {/* Contenido Markdown Renderizado */}
              {hasContent && (
                <div className="relative">
                  <MessageMarkdown content={message.content} isStreaming={isStreaming} />
                  {isStreaming && (
                    <span
                      className="inline-block w-2 h-4 bg-cyber-yellow ml-0.5 animate-pulse align-middle"
                      title="Generando..."
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isUser && (
          <div className="w-7 h-7 rounded bg-cyber-card border border-cyber-border flex items-center justify-center text-cyber-muted shrink-0">
            <User className="w-4 h-4" />
          </div>
        )}
      </article>
    );
  }
);

ChatMessageBubble.displayName = 'ChatMessageBubble';
export default ChatMessageBubble;
