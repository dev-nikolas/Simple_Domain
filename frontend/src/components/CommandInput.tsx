/**
 * Simple Domain — Terminal de Entrada Inferior (Cyberpunk HUD Console)
 * Principio de Responsabilidad Única y Composición.
 */

import React, { useState, useRef, useEffect } from 'react';
import { CornerDownLeft, Loader2, Shield, Zap } from 'lucide-react';
import { OperationsMenu } from './OperationsMenu';
import { CommandFeedback, CommandLog } from './CommandFeedback';

interface CommandInputProps {
  onSubmitCommand?: (text: string) => void;
  onFileSelected?: (file: File) => void;
  isProcessing?: boolean;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  onSubmitCommand,
  onFileSelected,
  isProcessing = false,
}) => {
  const [inputVal, setInputVal] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [history, setHistory] = useState<CommandLog[]>([]);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 220);
    el.style.height = `${nextHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [inputVal]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isSubmitting || isProcessing) return;

    if (onSubmitCommand) {
      onSubmitCommand(trimmed);
      setInputVal('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
      return;
    }

    setIsSubmitting(true);
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour12: false });
    const newLog: CommandLog = {
      id: Math.random().toString(36).substring(2, 9),
      command: trimmed,
      timestamp: timeStr,
      status: 'INFO',
      response: `Instrucción registrada en buffer local: "${trimmed}".`,
    };

    setTimeout(() => {
      setHistory((prev) => [newLog, ...prev.slice(0, 4)]);
      setInputVal('');
      setIsSubmitting(false);
      setShowLogModal(true);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = inputVal.trim().length > 0 && !isSubmitting && !isProcessing;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 relative z-30 select-none">
      {/* Guía de micro-telemetría superior */}
      <div className="flex items-center justify-between text-[10px] text-cyber-muted tracking-wider mb-1 px-1">
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400 font-bold flex items-center space-x-1">
            <Zap className="w-2.5 h-2.5 text-cyber-yellow" />
            <span>TERMINAL INPUT // RELIC-STREAM</span>
          </span>
          <span className="hidden sm:inline text-gray-500">[UTF-8 LOCAL MMAP]</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
            <Shield className="w-2.5 h-2.5" />
            <span>SOBERANÍA LOCAL: 100%</span>
          </span>
        </div>
      </div>

      {/* Modal emergente de feedback */}
      {showLogModal && <CommandFeedback logs={history} onClose={() => setShowLogModal(false)} />}

      {/* Formulario de entrada */}
      <form
        onSubmit={handleSubmit}
        className="group relative flex items-end bg-[#0a0b12]/95 border border-cyber-border focus-within:border-cyan-400 focus-within:shadow-lg focus-within:shadow-cyan-400/20 transition-all duration-200 p-2 rounded-xl backdrop-blur-xl"
      >
        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none group-focus-within:border-cyber-yellow transition-colors" />
        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none group-focus-within:border-cyber-yellow transition-colors" />

        <div className="shrink-0 pl-0.5 pr-1 pb-1">
          <OperationsMenu onFileSelected={onFileSelected} isProcessing={isProcessing} />
        </div>

        <label htmlFor="command-input" className="sr-only">Instrucción para RELIC</label>
        <textarea
          id="command-input"
          ref={textareaRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          rows={1}
          placeholder="Escribe una instrucción para RELIC (Enter para enviar, Shift+Enter para salto de línea)..."
          aria-label="Introduce una instrucción para RELIC"
          className="flex-1 min-w-0 bg-transparent px-2.5 sm:px-3 py-1.5 font-sans text-xs sm:text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none resize-none leading-relaxed select-text cursor-text max-h-[220px] overflow-y-auto"
        />

        <button
          type="submit"
          disabled={!canSubmit}
          aria-label={isProcessing ? 'Generando...' : isSubmitting ? 'Enviando...' : 'Enviar instrucción (Enter)'}
          className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 font-tech font-bold text-xs uppercase tracking-wider transition-all rounded-lg shrink-0 mb-0.5 ${
            canSubmit
              ? 'bg-cyber-yellow text-black hover:bg-white hover:shadow-lg hover:shadow-cyber-yellow/40 cursor-pointer'
              : isProcessing
              ? 'bg-[#151724] text-cyber-yellow border border-cyber-yellow/40 cursor-wait'
              : 'bg-[#10121c] text-gray-600 border border-cyber-border cursor-not-allowed opacity-60'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyber-yellow" />
              <span className="hidden xs:inline">PROCESANDO</span>
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden xs:inline">ENVIANDO...</span>
            </>
          ) : (
            <>
              <span className="hidden xs:inline">DISPATCH</span>
              <CornerDownLeft className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CommandInput;
