/**
 * Simple Domain — Tarjeta de Ejecución de Herramientas MCP / RELIC
 * Renderizado desacoplado de llamadas a herramientas con acordeón de inspección JSON.
 */

import React, { useState } from 'react';
import { Wrench, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface ToolExecutionProps {
  toolName: string;
  args?: Record<string, any>;
  result?: any;
  status?: 'running' | 'completed' | 'error';
  durationMs?: number;
}

export const ToolExecutionCard: React.FC<ToolExecutionProps> = ({
  toolName,
  args,
  result,
  status = 'completed',
  durationMs = 24,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isRunning = status === 'running';
  const isError = status === 'error';

  return (
    <div className="my-2 rounded-lg border border-cyan-500/30 bg-[#090b12] text-xs font-mono overflow-hidden shadow-md shadow-cyan-950/20">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-cyan-950/30 to-transparent hover:from-cyan-950/50 cursor-pointer select-none transition-colors border-b border-cyan-500/10"
      >
        <div className="flex items-center space-x-2.5">
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
          ) : isError ? (
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}

          <div className="flex items-center space-x-1.5">
            <Wrench className="w-3 h-3 text-cyber-yellow" />
            <span className="font-bold text-cyan-300 uppercase tracking-wide">
              {toolName}
            </span>
          </div>

          <span className="text-[10px] text-cyber-muted">
            {isRunning ? 'Ejecutando en MCP...' : `// ${durationMs}ms`}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-cyber-muted">
          <span className="text-[10px] uppercase font-sans">
            {isOpen ? 'Ocultar' : 'Inspeccionar'}
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-3 bg-black/60 space-y-2 text-[11px] border-t border-cyan-500/20">
          {args && (
            <div>
              <span className="text-cyber-muted text-[10px] uppercase block mb-1">
                Argumentos:
              </span>
              <pre className="p-2 rounded bg-white/5 border border-white/10 text-cyber-yellow overflow-x-auto whitespace-pre-wrap">
                {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {result && (
            <div>
              <span className="text-cyber-muted text-[10px] uppercase block mb-1">
                Resultado MCP:
              </span>
              <pre className="p-2 rounded bg-black/50 border border-cyber-border text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolExecutionCard;

