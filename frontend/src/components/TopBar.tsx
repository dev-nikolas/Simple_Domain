/**
 * Simple Domain — Barra Superior Flotante (TopBar)
 * Botones levitantes sin línea horizontal divisoria (versión, telemetría y aviso de online).
 */

import React from 'react';
import { Menu, Activity } from 'lucide-react';
import { UI_VERSION } from '../config/env';
import { TelemetryState } from '../types/api';

interface TopBarProps {
  onToggleMobileSidebar: () => void;
  onOpenDiagnostics: () => void;
  telemetry: TelemetryState;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileSidebar,
  onOpenDiagnostics,
  telemetry,
}) => {
  const { connectionStatus, health, isLoading } = telemetry;

  const getStatusBadge = () => {
    if (isLoading && !health) {
      return {
        label: 'CONNECTING',
        color: 'border-cyber-yellow/50 text-cyber-yellow bg-cyber-yellow/10',
        dot: 'bg-cyber-yellow animate-pulse',
      };
    }
    if (connectionStatus === 'ONLINE') {
      const isReady = health?.detector_ready;
      return {
        label: isReady ? 'ONLINE // READY' : 'ONLINE // UNPREPARED',
        color: isReady
          ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 shadow-emerald-950/40'
          : 'border-amber-500/50 text-amber-300 bg-amber-500/10 shadow-amber-950/40',
        dot: isReady ? 'bg-emerald-400' : 'bg-amber-400',
      };
    }
    if (connectionStatus === 'OFFLINE') {
      return {
        label: 'BACKEND OFFLINE',
        color: 'border-red-500/50 text-red-400 bg-red-500/10 shadow-red-950/40',
        dot: 'bg-red-500',
      };
    }
    return {
      label: 'ERROR',
      color: 'border-red-500/50 text-red-400 bg-red-500/10',
      dot: 'bg-red-500 animate-ping',
    };
  };

  const badge = getStatusBadge();

  return (
    <header className="w-full bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between text-xs font-mono pointer-events-none relative z-20 border-none">
      {/* Botón flotante para móvil (el resto queda fuera en escritorio) */}
      <div className="pointer-events-auto">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 bg-cyber-surface/90 border border-cyber-border hover:border-cyber-yellow/40 cut-corner-sm text-cyber-muted hover:text-cyber-yellow backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          title="Abrir menú de navegación"
          aria-label="Abrir menú de navegación lateral"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Botones levitantes: aviso de online, telemetría y versión */}
      <div className="pointer-events-auto flex items-center space-x-2 sm:space-x-2.5">
        {/* 1. Aviso de Online levitante */}
        <div className={`flex items-center space-x-1.5 border px-2.5 py-1 text-[10px] font-bold tracking-wider cut-corner-sm backdrop-blur-md shadow-lg ${badge.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          <span>{badge.label}</span>
        </div>

        {/* 2. Botón de Telemetría levitante */}
        <button
          onClick={onOpenDiagnostics}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-cyber-surface/90 hover:bg-cyber-yellow/15 border border-cyber-yellow/40 hover:border-cyber-yellow text-cyber-yellow cut-corner-sm backdrop-blur-md shadow-lg transition-all text-[10px] font-bold tracking-wider cursor-pointer"
          title="Abrir diagnóstico y telemetría"
          aria-label="Abrir diagnóstico del sistema"
        >
          <Activity className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">TELEMETRY</span>
        </button>

        {/* 3. Indicador de Versión levitante */}
        <div className="bg-cyber-surface/90 border border-cyber-border/70 text-cyber-muted px-2 py-1 text-[10px] cut-corner-sm backdrop-blur-md shadow-lg hidden sm:flex items-center tracking-wider">
          <span>{UI_VERSION}</span>
        </div>
      </div>
    </header>
  );
};
