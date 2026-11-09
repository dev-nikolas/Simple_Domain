/**
 * Simple Domain — Cabecera de Mensaje (Cyberpunk HUD Style)
 * Principio de Responsabilidad Única (SRP): Presentación del rol, avatar y acciones del mensaje.
 */

import React, { useState } from 'react';
import { User, Copy, Check, RotateCcw } from 'lucide-react';

interface MessageHeaderProps {
  isUser: boolean;
  content: string;
  isLastAssistantMessage?: boolean;
  isGenerating?: boolean;
  onRegenerate?: () => void;
}

export const MessageHeader: React.FC<MessageHeaderProps> = ({
  isUser,
  content,
  isLastAssistantMessage = false,
  isGenerating = false,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex items-center justify-between text-[10px] text-cyber-muted border-b border-cyber-border/40 pb-2 mb-2 select-none">
      <div className="flex items-center space-x-2">
        {isUser ? (
          <>
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-cyan-300 uppercase tracking-wider">
              OPERADOR // USUARIO
            </span>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-cyber-yellow text-black font-tech font-bold uppercase tracking-wider text-[11px] cut-corner-xs shadow-sm shadow-cyber-yellow/20">
              RELIC // COGNITIVE CORE
            </span>
            <span className="text-[10px] text-cyber-muted hidden sm:inline">
              ENGINE C // LOCAL
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 text-cyber-muted">
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 p-1 hover:text-cyber-yellow transition-colors cursor-pointer rounded"
          title="Copiar texto completo"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-bold">COPIADO</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px] uppercase hidden sm:inline">Copiar</span>
            </>
          )}
        </button>

        {isLastAssistantMessage && !isGenerating && onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center space-x-1 p-1 hover:text-cyan-400 transition-colors cursor-pointer rounded"
            title="Regenerar respuesta con RELIC"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-[10px] uppercase hidden sm:inline">Reintentar</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageHeader;

