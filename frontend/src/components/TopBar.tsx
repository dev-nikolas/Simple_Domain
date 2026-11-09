/**
 * Simple Domain — Barra Superior RELIC (TopBar)
 * Principio de Responsabilidad Única (SRP): Navegación responsive, identidad de marca y control de estado estilo Gemini.
 */

import React from 'react';
import { Menu, AlertCircle, RefreshCw } from 'lucide-react';
import { RelicLogo } from './RelicLogo';
import { CartridgeSelector } from './CartridgeSelector';

interface TopBarProps {
  onToggleSidebar: () => void;
  isGatewayOffline?: boolean;
  onRetryConnection?: () => void;
  activeSessionTitle?: string;
  activeCartridge?: string;
  onSelectCartridge?: (id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  isGatewayOffline = false,
  onRetryConnection,
  activeSessionTitle = 'Nueva Conversación',
  activeCartridge = 'auto',
  onSelectCartridge,
}) => {
  return (
    <header className="w-full h-14 bg-[#050508] border-b border-[#232736] px-3 sm:px-5 flex items-center justify-between relative z-40 backdrop-blur-xl select-none">
      {/* Lado izquierdo: Drawer Toggle + Marca RELIC + Selector de Cartucho estilo Gemini */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 bg-[#101117] hover:bg-[#1a1b24] border border-[#2b2f42] hover:border-cyber-red text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
          title="Abrir panel lateral (Sesiones y Memoria)"
          aria-label="Abrir panel lateral"
        >
          <Menu className="w-4 h-4 text-cyber-red" />
        </button>

        <div className="flex items-center space-x-2 shrink-0">
          <RelicLogo size={22} color="#ff1f3d" className="hover:drop-shadow-[0_0_8px_rgba(255,31,61,0.6)] transition-all" />
          <span className="font-tech font-black text-base tracking-widest text-white hidden xs:inline">
            RELIC
          </span>
        </div>

        {/* Selector de Cartucho integrado en TopBar estilo "Gemini Flash-Lite ⌄" */}
        {onSelectCartridge && (
          <div className="shrink-0">
            <CartridgeSelector
              activeCartridgeId={activeCartridge}
              onSelectCartridge={onSelectCartridge}
              variant="navbar"
            />
          </div>
        )}

        {/* Título de sesión activa en pantallas medianas/grandes */}
        <div className="hidden xl:flex items-center text-xs font-mono text-gray-400 truncate max-w-[240px] pl-3 border-l border-gray-800">
          <span className="truncate">{activeSessionTitle}</span>
        </div>
      </div>

      {/* Lado derecho: Estado de conexión soberano */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {isGatewayOffline ? (
          <button
            onClick={onRetryConnection}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-950/80 hover:bg-red-900/90 border border-cyber-red text-red-200 rounded-full text-xs font-mono font-bold transition-all cursor-pointer animate-pulse"
            title="Gateway desconectado. Clic para reintentar"
          >
            <AlertCircle className="w-3.5 h-3.5 text-cyber-red shrink-0" />
            <span className="hidden sm:inline">OFFLINE</span>
            <RefreshCw className="w-3 h-3 text-red-300 shrink-0" />
          </button>
        ) : (
          <div className="hidden xs:flex items-center space-x-1.5 px-2 py-0.5 bg-[#0e1017] border border-[#232736] rounded-full text-[11px] font-mono text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-red animate-ping" />
            <span className="font-bold text-gray-300">LOCAL</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
