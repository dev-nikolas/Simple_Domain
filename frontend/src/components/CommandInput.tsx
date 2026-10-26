/**
 * Simple Domain — Terminal de Entrada Inferior
 * Soporte de teclado, buffer local accesible y adaptación responsive completa.
 */

import React, { useState, useRef } from 'react';
import { Terminal, CornerDownLeft, XCircle, Clock } from 'lucide-react';
import { AppRoute } from '../hooks/useRouter';
import { OperationsMenu } from './OperationsMenu';

interface CommandLog {
  id: string;
  command: string;
  timestamp: string;
  status: 'QUEUED' | 'INFO';
  response: string;
}

interface CommandInputProps {
  onNavigate?: (route: AppRoute) => void;
  onSubmitCommand?: (text: string) => void;
  onFileSelected?: (file: File) => void;
  isProcessing?: boolean;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  onNavigate,
  onSubmitCommand,
  onFileSelected,
  isProcessing = false,
}) => {
  const [inputVal, setInputVal] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [history, setHistory] = useState<CommandLog[]>([]);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isSubmitting || isProcessing) return;

    if (onSubmitCommand) {
      onSubmitCommand(trimmed);
      setInputVal('');
      if (inputRef.current) inputRef.current.focus();
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
      if (inputRef.current) inputRef.current.focus();
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 relative z-30">
      {/* Feed emergente con respuesta transparente */}
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
        className="group relative flex items-center bg-cyber-surface/95 border border-cyber-border focus-within:border-cyber-yellow focus-within:shadow-cyber-yellow-sm transition-all duration-200 p-1 backdrop-blur-md"
      >
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-cyber-yellow/60 pointer-events-none group-focus-within:bg-cyber-yellow" />

        {/* Botón "+" para desplegar menú de subida de archivos / operaciones */}
        <div className="shrink-0 pl-0.5 pr-1">
          <OperationsMenu onNavigate={onNavigate} onFileSelected={onFileSelected} isProcessing={isProcessing} />
        </div>

        {/* Campo de texto principal */}
        <label htmlFor="command-input" className="sr-only">Instrucción para Simple Domain</label>
        <input
          id="command-input"
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          placeholder="Introduce una instrucción para Simple Domain..."
          aria-label="Introduce una instrucción para Simple Domain"
          className="flex-1 min-w-0 bg-transparent px-2.5 sm:px-4 py-2 font-mono text-xs sm:text-sm text-cyber-text placeholder:text-cyber-muted/60 focus:outline-none select-text cursor-text"
        />

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={!inputVal.trim() || isSubmitting}
          aria-label="Enviar instrucción (Enter)"
          className={`flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-2 font-mono text-xs font-bold transition-all cut-corner-sm shrink-0 ${
            inputVal.trim() && !isSubmitting
              ? 'bg-cyber-yellow text-black hover:bg-white hover:shadow-cyber-yellow cursor-pointer'
              : 'bg-cyber-card text-cyber-muted border border-cyber-border cursor-not-allowed opacity-50'
          }`}
          title="Enviar instrucción (Enter)"
        >
          <span className="hidden xs:inline sm:inline">{isSubmitting ? 'DISPATCHING...' : 'DISPATCH'}</span>
          <CornerDownLeft className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Microtexto técnico inferior */}
      <div className="flex items-center justify-between text-[10px] font-mono text-cyber-muted/60 mt-1 px-1 sm:px-2 select-none">
        <span>PRESS [ENTER] TO DISPATCH</span>
        <span className="hidden sm:inline">SECURITY // STRICT LOCAL MEMORY</span>
      </div>
    </div>
  );
};
