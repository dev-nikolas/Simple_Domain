/**
 * Simple Domain — Modal de Feedback del Terminal de Comandos
 * Principio de Responsabilidad Única (SRP): Presentación del historial de comandos despachados.
 */

import React from 'react';
import { Terminal, XCircle, Clock } from 'lucide-react';

export interface CommandLog {
  id: string;
  command: string;
  timestamp: string;
  status: 'QUEUED' | 'INFO';
  response: string;
}

interface CommandFeedbackProps {
  logs: CommandLog[];
  onClose: () => void;
}

export const CommandFeedback: React.FC<CommandFeedbackProps> = ({ logs, onClose }) => {
  if (logs.length === 0) return null;

  return (
    <div className="mb-2 sm:mb-3 bg-[#0d0e17]/95 border border-cyber-yellow/50 p-3 rounded-lg shadow-xl shadow-cyber-yellow/10 backdrop-blur-md">
      <div className="flex items-center justify-between text-[11px] font-mono text-cyber-yellow border-b border-cyber-border pb-1 mb-2">
        <span className="flex items-center space-x-1.5 font-bold">
          <Terminal className="h-3.5 w-3.5" />
          <span>TERMINAL FEEDBACK // DISPATCH</span>
        </span>
        <button
          onClick={onClose}
          className="text-cyber-muted hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar panel de feedback"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 text-xs font-mono">
        {logs.slice(0, 2).map((item) => (
          <div key={item.id} className="text-cyber-text">
            <div className="flex items-center space-x-2 text-[10px] text-cyber-muted">
              <Clock className="h-3 w-3 shrink-0" />
              <span>[{item.timestamp}]</span>
              <span className="text-cyber-yellow truncate">&gt; {item.command}</span>
            </div>
            <p className="text-[11px] text-cyber-muted/90 pl-5 border-l border-cyber-yellow/40 mt-0.5">
              {item.response}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommandFeedback;

