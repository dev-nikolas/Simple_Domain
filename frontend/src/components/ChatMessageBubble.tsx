/**
 * Simple Domain — Burbuja de Mensaje Modular (Cyberpunk HUD)
 * Principio de Responsabilidad Única y Composición.
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain } from 'lucide-react';
import { ChatMessage } from '../types/conversations';
import { CodeBlock } from './CodeBlock';
import { SandboxFeedbackCard } from './SandboxFeedbackCard';
import { MessageHeader } from './MessageHeader';
import { sanitizeStreamingMarkdown } from '../utils/markdownSanitizer';
import { RelicLogo } from './RelicLogo';

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

    const { thinkingContent, responseContent, isOnlyThinking } = useMemo(() => {
      const raw = message.content || '';
      const closeIdx = raw.indexOf('</think>');
      if (closeIdx !== -1) {
        const thinking = raw.slice(0, closeIdx).replace(/^<think>\s*/i, '').trim();
        const resp = raw.slice(closeIdx + 8).trim();
        return { thinkingContent: thinking, responseContent: resp, isOnlyThinking: false };
      }
      if (raw.startsWith('<think>')) {
        return { thinkingContent: raw.slice(7).trim(), responseContent: '', isOnlyThinking: true };
      }
      return { thinkingContent: null, responseContent: raw, isOnlyThinking: false };
    }, [message.content]);

    const isThinking = isGenerating && !hasContent && !thinkingContent;
    const isStreaming = isGenerating && (hasContent || Boolean(thinkingContent));

    const sanitizedContent = useMemo(
      () => sanitizeStreamingMarkdown(responseContent, isStreaming),
      [responseContent, isStreaming]
    );

    const hasSandboxVerification = !isUser && message.content.includes('[VERIFICADO EN SANDBOX]');

    return (
      <article
        aria-live={isGenerating ? 'polite' : 'off'}
        className={`flex items-start space-x-2.5 sm:space-x-3 font-mono text-xs transition-opacity duration-200 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {!isUser && (
          <div
            className={`w-8 h-8 rounded-lg bg-[#0e1017] border flex items-center justify-center shrink-0 transition-all ${
              isGenerating
                ? 'border-cyber-red shadow-sm shadow-cyber-red/20'
                : 'border-cyber-red/50'
            }`}
          >
            <RelicLogo size={18} color="#ff1f3d" />
          </div>
        )}

        <div
          className={`max-w-3xl w-full rounded-xl transition-all relative overflow-hidden ${
            isUser
              ? 'bg-[#141520] border border-cyber-red/40 text-white shadow-lg shadow-red-950/20 ml-6 sm:ml-8 p-3 sm:p-4'
              : 'bg-[#0a0b10]/95 border border-[#232736] text-gray-200 backdrop-blur-xl shadow-xl shadow-black/60 mr-6 sm:mr-8 p-3 sm:p-4'
          }`}
        >
          <MessageHeader
            isUser={isUser}
            content={responseContent || message.content}
            isLastAssistantMessage={isLastAssistantMessage}
            isGenerating={isGenerating}
            onRegenerate={onRegenerate}
          />

          <div className="leading-relaxed font-sans text-[13px] text-gray-200 select-text cursor-text">
            {thinkingContent && (
              <details
                className="mb-3 border border-red-950/60 bg-[#0c0d14] rounded-lg text-xs font-mono group"
                open={isOnlyThinking}
              >
                <summary className="px-3 py-1.5 cursor-pointer text-gray-400 hover:text-gray-200 flex items-center justify-between select-none">
                  <span className="flex items-center space-x-1.5 text-cyber-red/80 font-semibold text-[11px]">
                    <Brain className="w-3.5 h-3.5 text-cyber-red" />
                    <span>
                      {isOnlyThinking && isGenerating
                        ? 'Pensando...'
                        : 'Razonamiento'}
                    </span>
                  </span>
                  <span className="text-[10px] text-gray-500 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="p-3 border-t border-[#232736]/60 text-gray-400 text-[12px] leading-relaxed italic bg-black/30 select-text cursor-text whitespace-pre-wrap">
                  {thinkingContent}
                </div>
              </details>
            )}

            {isThinking ? (
              <div className="flex items-center space-x-2 py-2 text-gray-400 text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-red animate-pulse" />
                <span className="text-gray-400">Pensando...</span>
              </div>
            ) : sanitizedContent ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    return !inline && match ? (
                      <CodeBlock language={match[1]} codeString={codeString} props={props} />
                    ) : (
                      <code className="bg-white/10 text-red-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-white/10" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ href, children, ...props }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-red-400 underline hover:text-red-300 font-medium break-all" {...props}>
                        {children}
                      </a>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3 border border-[#232736] rounded-lg">
                        <table className="min-w-full divide-y divide-[#232736] text-left text-xs font-mono">{children}</table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return <th className="bg-[#12131d] px-3 py-2 font-bold text-cyber-red uppercase tracking-wider text-[10px] border-b border-[#232736]">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="px-3 py-2 border-b border-[#232736]/40 text-gray-300 text-[11px]">{children}</td>;
                  },
                  blockquote({ children }) {
                    return <blockquote className="border-l-2 border-cyber-red/70 pl-3 my-2 text-gray-400 italic text-[12px] bg-red-950/20 py-1 rounded-r">{children}</blockquote>;
                  },
                  p({ children }) {
                    return <p className="mb-2.5 last:mb-0">{children}</p>;
                  },
                }}
              >
                {sanitizedContent}
              </ReactMarkdown>
            ) : isOnlyThinking ? null : (
              <div className="text-gray-500 text-xs italic">Sin contenido de respuesta.</div>
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
