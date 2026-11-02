/**
 * Simple Domain — Sidebar / Offcanvas de Chats
 * Contiene únicamente lo esencial: gestión y selección de sesiones de chat, búsqueda, renombrado y nuevo chat.
 */

import React, { useEffect } from 'react';
import { PanelLeft, X, Cpu, Plus } from 'lucide-react';
import { APP_NAME } from '../config/env';
import { Conversation } from '../types/conversations';
import { SidebarSessions } from './SidebarSessions';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  conversations?: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (c: Conversation) => void;
  onNewConversation?: () => void;
  onDeleteConversation?: (id: string, t: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  searchQuery = '',
  onSearchChange,
}) => {
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseMobile();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileOpen, onCloseMobile]);

  const renderContent = (isMobileDrawer = false) => {
    const isCol = isCollapsed && !isMobileDrawer;
    return (
      <div className="h-full flex flex-col justify-between p-3 font-mono text-xs text-cyber-text">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyber-border shrink-0">
            {isCol ? (
              <div className="flex flex-col items-center space-y-2 w-full">
                <button
                  onClick={onToggleCollapse}
                  className="w-10 h-10 bg-cyber-card border border-cyber-yellow/40 hover:border-cyber-yellow flex items-center justify-center cut-corner-sm text-cyber-yellow transition-all group cursor-pointer"
                  title="Expandir barra lateral"
                  aria-label="Expandir barra lateral"
                >
                  <Cpu className="h-4 w-4 group-hover:hidden" />
                  <PanelLeft className="h-4 w-4 hidden group-hover:block" />
                </button>
                <button
                  onClick={() => onNewConversation?.()}
                  className="w-10 h-10 bg-cyber-yellow/10 hover:bg-cyber-yellow/20 border border-cyber-yellow/60 hover:border-cyber-yellow text-cyber-yellow flex items-center justify-center cut-corner-sm transition-all cursor-pointer shadow-sm shadow-cyber-yellow/20"
                  title="Nuevo Chat (+)"
                  aria-label="Nuevo Chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-8 h-8 shrink-0 bg-cyber-card border border-cyber-yellow/40 flex items-center justify-center cut-corner-sm">
                    <Cpu className="h-4 w-4 text-cyber-yellow" />
                  </div>
                  <span className="font-tech text-base tracking-wider text-white font-black truncate">
                    {APP_NAME}
                  </span>
                </div>
                <button
                  onClick={isMobileDrawer ? onCloseMobile : onToggleCollapse}
                  className="p-1.5 text-cyber-muted hover:text-cyber-yellow cursor-pointer"
                  title={isMobileDrawer ? 'Cerrar' : 'Contraer'}
                  aria-label={isMobileDrawer ? 'Cerrar barra lateral' : 'Contraer barra lateral'}
                >
                  {isMobileDrawer ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>

          {/* Botón de nuevo chat en modo expandido */}
          {!isCol && (
            <div className="mb-3 shrink-0">
              <button
                onClick={() => {
                  onNewConversation?.();
                  if (isMobileDrawer) onCloseMobile();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-cyber-yellow/10 hover:bg-cyber-yellow hover:text-black border border-cyber-yellow text-cyber-yellow cut-corner-sm font-bold transition-all cursor-pointer shadow-sm shadow-cyber-yellow/10"
                title="Iniciar nuevo chat"
              >
                <Plus className="h-4 w-4" />
                <span>NUEVO CHAT</span>
              </button>
            </div>
          )}

          {/* Lista de Chats / Sesiones */}
          {!isCol && (
            <div className="flex-1 min-h-0 flex flex-col">
              <SidebarSessions
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={(c) => {
                  onSelectConversation?.(c);
                  if (isMobileDrawer) onCloseMobile();
                }}
                onNew={() => {
                  onNewConversation?.();
                  if (isMobileDrawer) onCloseMobile();
                }}
                onDelete={onDeleteConversation}
                onRename={onRenameConversation}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/75 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-cyber-surface border-r border-cyber-yellow/40 md:hidden transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderContent(true)}
      </aside>
      <aside
        className={`hidden md:flex flex-col h-screen bg-cyber-surface/95 border-r border-cyber-border transition-all duration-300 shrink-0 relative z-30 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {renderContent(false)}
      </aside>
    </>
  );
};

export default Sidebar;
