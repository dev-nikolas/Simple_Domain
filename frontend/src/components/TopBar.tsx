/**
 * Simple Domain — Barra Superior Minimalista (TopBar)
 * Libre de indicadores de telemetría y estado en tiempo real.
 */

import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { APP_NAME } from '../config/env';

interface TopBarProps {
  onToggleMobileSidebar: () => void;
  onNewConversation?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileSidebar,
  onNewConversation,
}) => {
  return (
    <header className="w-full bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between text-xs font-mono pointer-events-none relative z-20 border-none">
      {/* Botones para móvil */}
      <div className="pointer-events-auto flex items-center space-x-2">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 bg-cyber-surface/90 border border-cyber-border hover:border-cyber-yellow/40 cut-corner-sm text-cyber-muted hover:text-cyber-yellow backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          title="Abrir chats"
          aria-label="Abrir chats"
        >
          <Menu className="h-4 w-4" />
        </button>
        {onNewConversation && (
          <button
            onClick={onNewConversation}
            className="md:hidden p-1.5 bg-cyber-surface/90 border border-cyber-yellow/40 hover:border-cyber-yellow cut-corner-sm text-cyber-yellow backdrop-blur-md shadow-lg transition-colors cursor-pointer"
            title="Nuevo Chat (+)"
            aria-label="Crear nuevo chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Cabecera limpia en desktop */}
      <div className="pointer-events-auto hidden md:flex items-center space-x-2">
        <span className="text-[11px] font-bold tracking-wider text-cyber-muted uppercase">
          {APP_NAME} // WORKSPACE
        </span>
      </div>
    </header>
  );
};

export default TopBar;
