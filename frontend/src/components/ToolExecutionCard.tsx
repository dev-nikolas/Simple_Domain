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
    <div className="my-2 rounded-lg border border-[#232736] bg-[#090a0f] text-xs font-mono overflow-hidden shadow-md">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between px-3.5 py-2 bg-[#0e1017] hover:bg-[#141620] cursor-pointer select-none transition-colors border-b border-[#232736]/60"
      >
        <div className="flex items-center space-x-2.5">
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 text-cyber-red animate-spin shrink-0" />
          ) : isError ? (
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-cyber-red shrink-0" />
          )}

          <div className="flex items-center space-x-1.5">
            <Wrench className="w-3 h-3 text-cyber-red" />
            <span className="font-bold text-gray-200 uppercase tracking-wide">
              {toolName}
            </span>
          </div>

          <span className="text-[10px] text-gray-500">
            {isRunning ? 'Ejecutando en MCP...' : `// ${durationMs}ms`}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-gray-400">
          <span className="text-[10px] uppercase font-sans">
            {isOpen ? 'Ocultar' : 'Inspeccionar'}
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-3 bg-black/60 space-y-2 text-[11px] border-t border-[#232736]/60">
          {args && (
            <div>
              <span className="text-gray-400 text-[10px] uppercase block mb-1">
                Argumentos:
              </span>
              <pre className="p-2 rounded bg-white/5 border border-white/10 text-red-300 overflow-x-auto whitespace-pre-wrap">
                {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {result && (
            <div>
              <span className="text-gray-400 text-[10px] uppercase block mb-1">
                Resultado MCP:
              </span>
              <pre className="p-2 rounded bg-black/50 border border-[#232736] text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
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
