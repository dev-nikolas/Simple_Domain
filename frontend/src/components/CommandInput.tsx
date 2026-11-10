/**
 * Simple Domain — Terminal de Entrada Inferior (Cyberpunk HUD Console en Puntas)
 * Principio de Responsabilidad Única (SRP): Entrada de usuario, auto-ajuste y despacho de instrucciones.
 * Estilo Cyberpunk: Formas angulares (cut-corner-sm / cut-corner-xs), acentos carmesí y telemetría local.
 */

import React, { useState, useRef, useEffect } from 'react';
import { CornerDownLeft, Shield, Square, Terminal } from 'lucide-react';
import { OperationsMenu } from './OperationsMenu';

interface CommandInputProps {
  onSubmitCommand?: (text: string) => void;
  onStopGeneration?: () => void;
  onFileSelected?: (file: File) => void;
  isProcessing?: boolean;
  isGatewayOffline?: boolean;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  onSubmitCommand,
  onStopGeneration,
  onFileSelected,
  isProcessing = false,
  isGatewayOffline = false,
}) => {
  const [inputVal, setInputVal] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 40), 180)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [inputVal]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isProcessing) return;

    if (onSubmitCommand) {
      onSubmitCommand(trimmed);
      setInputVal('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = inputVal.trim().length > 0 && !isProcessing;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-2 relative z-30 select-none font-mono">
      {/* Micro-guía de telemetría superior */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 tracking-wider mb-1 px-1">
        <div className="flex items-center space-x-1.5 truncate">
          <Terminal className="w-2.5 h-2.5 text-cyber-red shrink-0" />
          <span className="truncate text-gray-400">TERMINAL INPUT // RELIC-STREAM</span>
        </div>
        <div className="hidden xs:flex items-center space-x-1 text-gray-400 shrink-0">
          <Shield className="w-2.5 h-2.5 text-cyber-red" />
          <span>SOBERANÍA LOCAL: 100%</span>
        </div>
      </div>

      {/* Contenedor angular en puntas estilo Cyberpunk (cut-corner-sm) */}
      <form
        onSubmit={handleSubmit}
        className="group relative flex items-center bg-[#0a0a10]/95 border border-[#232736] focus-within:border-cyber-red focus-within:shadow-xl focus-within:shadow-red-950/40 transition-all duration-200 px-2 sm:px-3 py-1.5 sm:py-2 cut-corner-sm backdrop-blur-xl"
      >
        <div className="shrink-0">
          <OperationsMenu onFileSelected={onFileSelected} isProcessing={isProcessing} />
        </div>

        <label htmlFor="command-input" className="sr-only">Instrucción para RELIC</label>
        <textarea
          id="command-input"
          ref={textareaRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={isGatewayOffline ? '[OFFLINE] Gateway desconectado (:3000)...' : 'Escribe una instrucción para RELIC...'}
          className="flex-1 min-w-0 bg-transparent px-2.5 sm:px-3 py-1 font-sans text-xs sm:text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none resize-none leading-relaxed select-text cursor-text max-h-[180px] overflow-y-auto"
        />

        <div className="shrink-0 flex items-center pl-2">
          {isProcessing ? (
            <button
              type="button"
              onClick={onStopGeneration}
              aria-label="Detener respuesta"
              title="Detener respuesta"
              className="w-8 h-8 cut-corner-xs flex items-center justify-center bg-cyber-red/20 border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white transition-all shrink-0 cursor-pointer shadow-sm shadow-cyber-red/30 animate-pulse"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              aria-label="Enviar instrucción"
              className={`w-8 h-8 cut-corner-xs flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                canSubmit
                  ? 'bg-cyber-red text-white hover:bg-cyber-red-bright hover:shadow-md hover:shadow-cyber-red/30'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              <CornerDownLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CommandInput;
