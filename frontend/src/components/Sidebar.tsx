/**
 * Simple Domain — Sidebar de Navegación Lateral Izquierda con Sesiones
 */

import React, { useEffect } from 'react';
import { Home, Database, Network, FlaskConical, Settings, Activity, PanelLeft, X, Cpu, Plus, Box, MessageSquare } from 'lucide-react';
import { APP_NAME } from '../config/env';
import { AppRoute } from '../hooks/useRouter';
import { Conversation } from '../types/conversations';
import { SidebarSessions } from './SidebarSessions';

interface SidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  isMobileOpen: boolean; onCloseMobile: () => void; isCollapsed: boolean; onToggleCollapse: () => void;
  onOpenDiagnostics: () => void; isBackendOnline: boolean; conversations?: Conversation[];
  activeConversationId?: string | null; onSelectConversation?: (c: Conversation) => void;
  onNewConversation?: () => void; onDeleteConversation?: (id: string, t: string) => void;
  isSandboxMode?: boolean; onToggleSandboxMode?: () => void;
}

const NAV_ITEMS: { id: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: '/', label: 'Home', icon: Home }, { id: '/research', label: 'Research', icon: FlaskConical },
  { id: '/data-sources', label: 'Data Sources', icon: Database }, { id: '/patterns', label: 'Patterns', icon: Network },
  { id: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  onOpenDiagnostics,
  isBackendOnline,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isSandboxMode = false,
  onToggleSandboxMode,
}) => {
  const sandboxActive = Boolean(isSandboxMode);
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseMobile();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = prev;
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isMobileOpen, onCloseMobile]);

  const renderContent = (isMobileDrawer = false) => {
    const isCol = isCollapsed && !isMobileDrawer;
    return (
      <div className="h-full flex flex-col justify-between p-3 font-mono text-xs text-cyber-text">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyber-border shrink-0">
            {isCol ? (
              <div className="flex flex-col items-center space-y-2 w-full">
                <button
                  onClick={onToggleCollapse}
                  className="w-10 h-10 bg-cyber-card border border-cyber-yellow/40 hover:border-cyber-yellow flex items-center justify-center cut-corner-sm text-cyber-yellow transition-all group cursor-pointer"
                  title="Expandir barra lateral"
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
                  <span className="font-tech text-base tracking-wider text-white font-black truncate">{APP_NAME}</span>
                </div>
                <button
                  onClick={isMobileDrawer ? onCloseMobile : onToggleCollapse}
                  className="p-1.5 text-cyber-muted hover:text-cyber-yellow cursor-pointer"
                  title={isMobileDrawer ? 'Cerrar' : 'Contraer'}
                >
                  {isMobileDrawer ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>

          <nav className="space-y-1 shrink-0" aria-label="Navegación principal">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = currentRoute === id || (id === '/' && currentRoute.startsWith('/c/'));
              return (
                <button
                  key={id}
                  onClick={() => { onNavigate(id); if (isMobileDrawer) onCloseMobile(); }}
                  className={`w-full flex items-center ${isCol ? 'justify-center px-2' : 'justify-between px-3'} py-2 text-[11px] transition-all cursor-pointer ${
                    active ? 'bg-cyber-yellow/10 border-l-2 border-cyber-yellow text-cyber-yellow font-bold' : 'text-cyber-muted hover:text-white hover:bg-cyber-card/60'
                  }`}
                  title={isCol ? label : undefined}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-cyber-yellow' : ''}`} />
                    {!isCol && <span>{label}</span>}
                  </div>
                  {!isCol && active && <span className="text-[8px] text-cyber-yellow font-mono font-bold">ACTIVO</span>}
                </button>
              );
            })}
          </nav>

          {!isCol && (
            <SidebarSessions
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={(c) => { onSelectConversation?.(c); if (isMobileDrawer) onCloseMobile(); }}
              onNew={() => { onNewConversation?.(); if (isMobileDrawer) onCloseMobile(); }}
              onDelete={onDeleteConversation}
            />
          )}
        </div>

        <div className="pt-3 border-t border-cyber-border space-y-1.5 shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onToggleSandboxMode?.()}
              className={`flex-1 flex items-center ${isCol ? 'justify-center px-2' : 'space-x-2 px-3'} py-2 cut-corner-sm transition-all text-[11px] font-bold cursor-pointer ${
                sandboxActive
                  ? 'bg-cyan-950/60 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/50'
                  : 'bg-cyber-card border border-cyber-border hover:border-cyber-yellow text-cyber-yellow'
              }`}
              title={sandboxActive ? 'Modo actual: SANDBOX 3D (Click para cambiar a Modo Chat)' : 'Modo actual: CHAT (Click para cambiar a SANDBOX 3D)'}
            >
              {sandboxActive ? <Box className="h-4 w-4 shrink-0 text-cyan-400 animate-pulse" /> : <MessageSquare className="h-4 w-4 shrink-0 text-cyber-yellow" />}
              {!isCol && (
                <div className="flex-1 flex items-center justify-between">
                  <span>{sandboxActive ? 'SANDBOX 3D' : 'MODE: CHAT'}</span>
                  <span className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-emerald-400' : 'bg-red-400'}`} title={isBackendOnline ? 'Online' : 'Offline'} />
                </div>
              )}
            </button>
            {!isCol && (
              <button onClick={onOpenDiagnostics} className="p-2 bg-cyber-card border border-cyber-border hover:border-cyber-yellow text-cyber-muted hover:text-cyber-yellow cut-corner-sm cursor-pointer" title="Telemetría">
                <Activity className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 bg-black/75 z-40 md:hidden" onClick={onCloseMobile} />}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-cyber-surface border-r border-cyber-yellow/40 md:hidden transform transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {renderContent(true)}
      </aside>
      <aside className={`hidden md:flex flex-col h-screen bg-cyber-surface/95 border-r border-cyber-border transition-all duration-300 shrink-0 relative z-30 ${isCollapsed ? 'w-16' : 'w-60'}`}>
        {renderContent(false)}
      </aside>
    </>
  );
};
