/**
 * Simple Domain — Terminal de Entrada Inferior
 * Soporte de textarea autoajustable, atajos de teclado (Enter enviar, Shift+Enter salto),
 * control IME, menú de operaciones y estados de generación en tiempo real.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, CornerDownLeft, XCircle, Clock, Loader2 } from 'lucide-react';
import { OperationsMenu } from './OperationsMenu';

interface CommandLog {
  id: string;
  command: string;
  timestamp: string;
  status: 'QUEUED' | 'INFO';
  response: string;
}

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

  // Reajustar altura dinámica del textarea
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, 40), 200);
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
    // Si el usuario está usando IME (composición de caracteres/acentos), no enviar
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = inputVal.trim().length > 0 && !isSubmitting && !isProcessing;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 relative z-30">
      {/* Feed emergente con respuesta */}
      {showLogModal && history.length > 0 && (
        <div className="mb-2 sm:mb-3 bg-cyber-surface/95 border border-cyber-yellow/40 p-3 cut-corner-sm shadow-cyber-yellow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyber-yellow border-b border-cyber-border pb-1 mb-2">
            <span className="flex items-center space-x-1.5 font-bold">
              <Terminal className="h-3.5 w-3.5" />
              <span>TERMINAL FEEDBACK // COMMAND_DISPATCH</span>
            </span>
            <button
              onClick={() => setShowLogModal(false)}
              className="text-cyber-muted hover:text-white transition-colors"
              aria-label="Cerrar panel de feedback de comando"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {history.slice(0, 2).map((item) => (
              <div key={item.id} className="text-cyber-text">
                <div className="flex items-center space-x-2 text-[10px] text-cyber-muted">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>[{item.timestamp}]</span>
                  <span className="text-cyber-yellow truncate">&gt; {item.command}</span>
                </div>
                <p className="text-[11px] text-cyber-muted/90 pl-5 border-l border-cyber-yellow/30 mt-0.5">
                  {item.response}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de entrada terminal cyberpunk */}
      <form
        onSubmit={handleSubmit}
        className="group relative flex items-end bg-cyber-surface/95 border border-cyber-border focus-within:border-cyber-yellow focus-within:shadow-cyber-yellow-sm transition-all duration-200 p-1.5 backdrop-blur-md cut-corner-sm"
      >
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-cyber-yellow/60 pointer-events-none group-focus-within:bg-cyber-yellow" />

        {/* Botón "+" para adjuntar archivos */}
        <div className="shrink-0 pl-0.5 pr-1 pb-1">
          <OperationsMenu onFileSelected={onFileSelected} isProcessing={isProcessing} />
        </div>

        {/* Textarea multilínea autoajustable */}
        <label htmlFor="command-input" className="sr-only">Instrucción para Simple Domain</label>
        <textarea
          id="command-input"
          ref={textareaRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          rows={1}
          placeholder="Escribe una instrucción (Enter para enviar, Shift+Enter para salto de línea)..."
          aria-label="Introduce una instrucción para Simple Domain"
          className="flex-1 min-w-0 bg-transparent px-2.5 sm:px-3 py-1.5 font-mono text-xs sm:text-sm text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none resize-none leading-relaxed select-text cursor-text max-h-[200px] overflow-y-auto custom-scrollbar"
        />

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label={
            isProcessing
              ? 'Generando respuesta...'
              : isSubmitting
              ? 'Enviando...'
              : 'Enviar instrucción (Enter)'
          }
          className={`flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-2 font-mono text-xs font-bold transition-all cut-corner-sm shrink-0 mb-0.5 ${
            canSubmit
              ? 'bg-cyber-yellow text-black hover:bg-white hover:shadow-cyber-yellow cursor-pointer'
              : isProcessing
              ? 'bg-cyber-card/80 text-cyber-yellow border border-cyber-yellow/40 cursor-wait'
              : 'bg-cyber-card text-cyber-muted border border-cyber-border cursor-not-allowed opacity-50'
          }`}
          title={
            isProcessing
              ? 'Generando respuesta en streaming...'
              : 'Enviar instrucción (Enter, Shift+Enter para nueva línea)'
          }
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyber-yellow" />
              <span className="hidden xs:inline sm:inline">GENERANDO</span>
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden xs:inline sm:inline">ENVIANDO...</span>
            </>
          ) : (
            <>
              <span className="hidden xs:inline sm:inline">ENVIAR</span>
              <CornerDownLeft className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CommandInput;
