/**
 * Simple Domain — Sidebar de Navegación Lateral Izquierda
 * Estilo identidad cyberpunk industrial. Soporta colapso, scroll lock y modo móvil sin colisión de logo.
 */

import React, { useEffect } from 'react';
import { Home, Database, Network, FlaskConical, Settings, Activity, PanelLeft, X, Cpu, Plus } from 'lucide-react';
import { APP_NAME } from '../config/env';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenDiagnostics: () => void;
  isBackendOnline: boolean;
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, active: true },
  { id: 'data', label: 'Data Sources', icon: Database, disabled: true },
  { id: 'patterns', label: 'Patterns', icon: Network, disabled: true },
  { id: 'research', label: 'Research', icon: FlaskConical, disabled: true },
  { id: 'settings', label: 'Settings', icon: Settings, disabled: true },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  onOpenDiagnostics,
  isBackendOnline,
}) => {
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseMobile();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileOpen, onCloseMobile]);

  const renderContent = (isMobileDrawer = false) => {
    const isCol = isCollapsed && !isMobileDrawer;
    return (
      <div className="h-full flex flex-col justify-between p-3 font-mono text-xs text-cyber-text">
        <div>
          {/* Encabezado sin colisión de logo */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-cyber-border">
            {isCol ? (
              <button
                onClick={onToggleCollapse}
                className="w-10 h-10 mx-auto bg-cyber-card border border-cyber-yellow/40 hover:border-cyber-yellow hover:bg-cyber-yellow/10 flex items-center justify-center cut-corner-sm text-cyber-yellow transition-all group cursor-pointer"
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
              >
                <Cpu className="h-4 w-4 group-hover:hidden" />
                <PanelLeft className="h-4 w-4 hidden group-hover:block" />
              </button>
            ) : (
              <>
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-8 h-8 shrink-0 bg-cyber-card border border-cyber-yellow/40 flex items-center justify-center cut-corner-sm shadow-cyber-yellow-sm">
                    <Cpu className="h-4 w-4 text-cyber-yellow" />
                  </div>
                  <span className="font-tech text-base tracking-wider text-white font-black truncate">{APP_NAME}</span>
                </div>
                <button
                  onClick={isMobileDrawer ? onCloseMobile : onToggleCollapse}
                  className="p-1.5 text-cyber-muted hover:text-cyber-yellow"
                  title={isMobileDrawer ? 'Cerrar barra lateral' : 'Contraer barra lateral'}
                  aria-label={isMobileDrawer ? 'Cerrar barra lateral' : 'Contraer barra lateral'}
                >
                  {isMobileDrawer ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>

          {/* Acción New Session (No funcional en v1.0) */}
          <div className="mb-3">
            <button
              disabled
              aria-disabled="true"
              className={`w-full flex items-center ${isCol ? 'justify-center' : 'justify-between px-3'} py-2 bg-cyber-card/40 border border-cyber-border/60 text-cyber-muted/50 text-[11px] cut-corner-sm cursor-not-allowed`}
              title="Nueva sesión (Planificado v1.1)"
              aria-label="Nueva sesión (Planificado para v1.1)"
            >
              <div className="flex items-center space-x-2">
                <Plus className="h-3.5 w-3.5" />
                {!isCol && <span>New Session</span>}
              </div>
              {!isCol && <span className="text-[8px] bg-cyber-bg px-1 border border-cyber-border/40">PLANNED</span>}
            </button>
          </div>

          {/* Lista de Navegación */}
          <nav className="space-y-1" aria-label="Navegación principal">
            {NAV_ITEMS.map(({ id, label, icon: Icon, active, disabled }) => (
              <div
                key={id}
                role={active ? 'link' : undefined}
                aria-current={active ? 'page' : undefined}
                aria-disabled={disabled ? 'true' : undefined}
                className={`flex items-center ${isCol ? 'justify-center px-2' : 'justify-between px-3'} py-2 text-[11px] ${
                  active
                    ? 'bg-cyber-yellow/10 border-l-2 border-cyber-yellow text-cyber-yellow font-bold'
                    : 'text-cyber-muted/40 cursor-not-allowed select-none'
                }`}
                title={isCol ? label : undefined}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-cyber-yellow' : ''}`} />
                  {!isCol && <span>{label}</span>}
                </div>
                {!isCol && !active && <span className="text-[8px] text-cyber-muted/40">PENDING</span>}
              </div>
            ))}
          </nav>
        </div>

        {/* Pie del Sidebar: Diagnóstico y Estado Local */}
        <div className="pt-3 border-t border-cyber-border space-y-2">
          <button
            onClick={onOpenDiagnostics}
            className={`w-full flex items-center ${isCol ? 'justify-center px-2' : 'space-x-2 px-3'} py-2 bg-cyber-card hover:bg-cyber-yellow/10 border border-cyber-yellow/40 text-cyber-yellow cut-corner-sm transition-all text-[11px] font-bold cursor-pointer`}
            title="Abrir Telemetría y Diagnóstico"
            aria-label="Abrir panel de telemetría y diagnóstico del sistema"
          >
            <Activity className="h-4 w-4 shrink-0 text-cyber-yellow" />
            {!isCol && (
              <div className="flex-1 flex items-center justify-between">
                <span>DIAGNOSTICS</span>
                <span className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              </div>
            )}
          </button>
          {!isCol && (
            <div className="px-1 text-[9px] text-cyber-muted/60 flex justify-between">
              <span>CORE // v0.1</span>
              <span>LOCAL INSTANCE</span>
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
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-cyber-surface border-r border-cyber-yellow/40 shadow-2xl md:hidden transform transition-transform duration-300 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isMobileOpen}
      >
        {renderContent(true)}
      </aside>
      <aside className={`hidden md:flex flex-col h-screen bg-cyber-surface/95 border-r border-cyber-border transition-all duration-300 ease-in-out shrink-0 relative z-30 ${isCollapsed ? 'w-16' : 'w-60'}`}>
        {renderContent(false)}
      </aside>
    </>
  );
};
