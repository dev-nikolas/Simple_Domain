/**
 * Simple Domain — Barra de Estado Inferior (StatusBar)
 * Pie técnico minimalista con indicadores de ejecución local y adaptación responsive.
 */

import React from 'react';
import { Lock, Server, Cpu } from 'lucide-react';
import { API_BASE_URL } from '../config/env';

interface StatusBarProps {
  isOnline: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isOnline }) => {
  return (
    <footer className="w-full border-t border-cyber-border bg-cyber-surface/90 px-3 sm:px-4 py-1.5 sm:py-2 flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] font-mono text-cyber-muted select-none relative z-20">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className={`flex items-center space-x-1 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-semibold tracking-wider">{isOnline ? 'SYSTEM READY' : 'STANDALONE MODE'}</span>
        </div>

        <span className="text-cyber-border">·</span>

        <div className="flex items-center space-x-1">
          <Lock className="h-3 w-3 text-cyber-yellow" />
          <span className="text-cyber-text font-medium">LOCAL ONLY</span>
        </div>

        <span className="text-cyber-border">·</span>

        <div className="flex items-center space-x-1">
          <Cpu className="h-3 w-3 text-cyber-cyan" />
          <span>CORE v0.1</span>
        </div>
      </div>

      <div className="hidden sm:flex items-center space-x-3 text-[10px] text-cyber-muted/80">
        <div className="flex items-center space-x-1">
          <Server className="h-3 w-3 text-cyber-yellow" />
          <span>TARGET: {API_BASE_URL}</span>
        </div>
        <span className="text-cyber-border">·</span>
        <span>H1 RELATIONAL</span>
      </div>
    </footer>
  );
};
