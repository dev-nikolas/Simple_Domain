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
    <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-[#232736]/60 pb-2 mb-2 select-none">
      <div className="flex items-center space-x-2">
        {isUser ? (
          <>
            <User className="w-3.5 h-3.5 text-cyber-red" />
            <span className="font-bold text-gray-300 uppercase tracking-wider">
              OPERADOR // USUARIO
            </span>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-cyber-red text-white font-tech font-bold uppercase tracking-wider text-[11px] cut-corner-xs shadow-sm shadow-cyber-red/20">
              RELIC
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 text-gray-400">
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 p-1 hover:text-cyber-red transition-colors cursor-pointer rounded"
          title="Copiar texto completo"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-cyber-red" />
              <span className="text-[10px] text-cyber-red font-bold">COPIADO</span>
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
            className="flex items-center space-x-1 p-1 hover:text-cyber-red transition-colors cursor-pointer rounded"
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
