/**
 * Simple Domain — Tarjeta de Verificación Ejecutiva en Sandbox (RELIC Engine)
 * Muestra el resultado de verificación formal de código (relic_agent_verify_code_block)
 * con badges de estado, código de salida y telemetría de ejecución.
 */

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Terminal, Play } from 'lucide-react';

interface SandboxFeedbackProps {
  verified?: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  executionTimeMs?: number;
  onReverify?: () => void;
}

export const SandboxFeedbackCard: React.FC<SandboxFeedbackProps> = ({
  verified = true,
  exitCode = 0,
  stdout = 'Ejecución exitosa en entorno aislado sandbox de RELIC.',
  stderr = '',
  executionTimeMs = 18,
  onReverify,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isSuccess = verified && exitCode === 0;

  return (
    <div
      className={`my-3 rounded-lg border transition-all overflow-hidden ${
        isSuccess
          ? 'bg-[#10121a] border-cyber-red/50 text-gray-200'
          : 'bg-red-950/30 border-cyber-red text-red-300'
      }`}
    >
      <div className="flex items-center justify-between px-3.5 py-2 select-none bg-black/40">
        <div className="flex items-center space-x-2.5">
          {isSuccess ? (
            <ShieldCheck className="w-4 h-4 text-cyber-red shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            {isSuccess ? 'VERIFICACIÓN EJECUTIVA: APROBADA' : 'VERIFICACIÓN EJECUTIVA: FALLO'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 border border-current font-mono">
            Exit Code: {exitCode}
          </span>
          <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">
            // {executionTimeMs}ms en Sandbox
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onReverify && (
            <button
              onClick={onReverify}
              className="flex items-center space-x-1 px-2 py-0.5 text-[10px] rounded bg-white/5 hover:bg-white/10 border border-current transition-colors cursor-pointer"
              title="Re-ejecutar en sandbox"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>RE-TEST</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer text-gray-400 hover:text-white"
            title={isExpanded ? 'Contraer log' : 'Ver log del sandbox'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 bg-black/70 border-t border-[#232736]/60 font-mono text-[11px] space-y-2">
          {stdout && (
            <div>
              <div className="flex items-center space-x-1 text-gray-400 text-[10px] mb-1">
                <Terminal className="w-3 h-3 text-cyber-red" />
                <span>STDOUT:</span>
              </div>
              <pre className="text-gray-300 bg-black/50 p-2 rounded border border-[#232736] overflow-x-auto whitespace-pre-wrap">
                {stdout}
              </pre>
            </div>
          )}

          {stderr && (
            <div>
              <div className="flex items-center space-x-1 text-red-400 text-[10px] mb-1">
                <Terminal className="w-3 h-3 text-red-400" />
                <span>STDERR:</span>
              </div>
              <pre className="text-red-300 bg-red-950/40 p-2 rounded border border-cyber-red/50 overflow-x-auto whitespace-pre-wrap">
                {stderr}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SandboxFeedbackCard;
