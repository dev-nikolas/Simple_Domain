/**
 * Simple Domain — Burbuja de Mensaje Modular (Cyberpunk HUD)
 * Principio de Responsabilidad Única y Composición.
 */

import React, { useMemo } from 'react';
import { Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../types/conversations';
import { CodeBlock } from './CodeBlock';
import { SandboxFeedbackCard } from './SandboxFeedbackCard';
import { MessageHeader } from './MessageHeader';
import { sanitizeStreamingMarkdown } from '../utils/markdownSanitizer';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isGenerating?: boolean;
  isLastAssistantMessage?: boolean;
  onRegenerate?: () => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = React.memo(
  ({ message, isGenerating = false, isLastAssistantMessage = false, onRegenerate }) => {
    const isUser = message.role === 'user';
    const hasContent = Boolean(message.content && message.content.trim() !== '');
    const isThinking = isGenerating && !hasContent;
    const isStreaming = isGenerating && hasContent;

    const sanitizedContent = useMemo(
      () => sanitizeStreamingMarkdown(message.content, isStreaming),
      [message.content, isStreaming]
    );

    const hasSandboxVerification = !isUser && message.content.includes('[VERIFICADO EN SANDBOX]');

    return (
      <article
        aria-live={isGenerating ? 'polite' : 'off'}
        className={`flex items-start space-x-3 font-mono text-xs transition-opacity duration-200 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {!isUser && (
          <div
            className={`w-8 h-8 rounded-lg bg-[#0e1017] border flex items-center justify-center shrink-0 transition-all ${
              isGenerating
                ? 'border-cyber-yellow text-cyber-yellow shadow-lg shadow-cyber-yellow/20 animate-pulse'
                : 'border-cyber-yellow/40 text-cyber-yellow'
            }`}
          >
            <Cpu className={`w-4 h-4 ${isThinking ? 'animate-spin' : isStreaming ? 'animate-pulse' : ''}`} />
          </div>
        )}

        <div
          className={`max-w-3xl w-full rounded-xl transition-all relative overflow-hidden ${
            isUser
              ? 'bg-gradient-to-r from-cyan-950/30 to-[#0e131d] border border-cyan-500/50 text-white shadow-lg shadow-cyan-950/20 ml-8 p-4'
              : 'bg-[#0b0c14]/90 border border-cyber-border text-cyber-text backdrop-blur-xl shadow-xl shadow-black/50 mr-8 p-4'
          }`}
        >
          <MessageHeader
            isUser={isUser}
            content={message.content}
            isLastAssistantMessage={isLastAssistantMessage}
            isGenerating={isGenerating}
            onRegenerate={onRegenerate}
          />

          <div className="leading-relaxed font-sans text-[13px] text-gray-200">
            {isThinking ? (
              <div className="flex items-center space-x-2 py-2 text-cyber-muted text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-cyber-yellow animate-ping" />
                <span className="animate-pulse text-cyber-yellow">
                  Consultando base de conocimiento y resolviendo con RELIC...
                </span>
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    return !inline && match ? (
                      <CodeBlock language={match[1]} codeString={codeString} props={props} />
                    ) : (
                      <code className="bg-white/10 text-cyber-yellow px-1.5 py-0.5 rounded text-[11px] font-mono border border-white/10" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ href, children, ...props }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300 font-medium break-all" {...props}>
                        {children}
                      </a>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3 border border-cyber-border/60 rounded-lg">
                        <table className="min-w-full divide-y divide-cyber-border/60 text-left text-xs font-mono">{children}</table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return <th className="bg-[#12131d] px-3 py-2 font-bold text-cyber-yellow uppercase tracking-wider text-[10px] border-b border-cyber-border">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="px-3 py-2 border-b border-cyber-border/30 text-gray-300 text-[11px]">{children}</td>;
                  },
                  blockquote({ children }) {
                    return <blockquote className="border-l-2 border-cyber-yellow/70 pl-3 my-2 text-cyber-muted italic text-[12px] bg-cyber-yellow/5 py-1 rounded-r">{children}</blockquote>;
                  },
                  p({ children }) {
                    return <p className="mb-2.5 last:mb-0">{children}</p>;
                  },
                }}
              >
                {sanitizedContent}
              </ReactMarkdown>
            )}

            {hasSandboxVerification && (
              <SandboxFeedbackCard verified={true} exitCode={0} stdout="Verificación de código confirmada en sandbox de RELIC." />
            )}
          </div>
        </div>
      </article>
    );
  }
);

ChatMessageBubble.displayName = 'ChatMessageBubble';
export default ChatMessageBubble;
