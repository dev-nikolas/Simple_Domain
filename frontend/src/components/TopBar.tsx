/**
 * Simple Domain — Barra Superior Cyberpunk 2077 HUD (TopBar)
 * Inspirada directamente en la interfaz Kitsch de Cyberpunk 2077 (Imagen 1) y Edgerunners (Imagen 2).
 * Incorpora:
 * - Indicador de página/sesión: "08 / 18 PAGE" con medidor cian.
 * - Selector de nivel de seguridad/razonamiento segmentado [01] [02] [03] [04].
 * - Selector de Cartucho LoRA/KB (.kb.relic).
 * - Acceso directo a la Memoria Episódica (episodic_log.relic).
 */

import React from 'react';
import { Menu, Plus, Database } from 'lucide-react';
import { CartridgeSelector } from './CartridgeSelector';

interface TopBarProps {
  onToggleMobileSidebar: () => void;
  onNewConversation?: () => void;
  activeSessionIndex?: number;
  totalSessions?: number;
  activeCartridge?: string;
  onSelectCartridge?: (cartridge: string) => void;
  securityLevel?: number;
  onSelectSecurityLevel?: (level: number) => void;
  onOpenEpisodicMemory?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileSidebar,
  onNewConversation,
  activeSessionIndex = 1,
  totalSessions = 1,
  activeCartridge = 'auto',
  onSelectCartridge,
  securityLevel = 2,
  onSelectSecurityLevel,
  onOpenEpisodicMemory,
}) => {
  const currentNum = String(activeSessionIndex).padStart(2, '0');
  const totalNum = String(Math.max(totalSessions, 1)).padStart(2, '0');
  const progressPct = Math.min(Math.max((activeSessionIndex / Math.max(totalSessions, 1)) * 100, 15), 100);

  return (
    <header className="w-full bg-[#08090f]/90 border-b border-cyber-border/60 px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col space-y-1.5 text-xs font-mono relative z-20 backdrop-blur-xl">
      {/* Guía superior técnica con icono de diamante y contador de sesión estilo Imagen 1 */}
      <div className="flex items-center justify-between text-[10px] text-cyber-muted tracking-wider border-b border-white/5 pb-1 select-none">
        <div className="flex items-center space-x-2">
          {/* Glifo de diamante técnico */}
          <div className="w-2.5 h-2.5 border border-cyan-400 rotate-45 flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-400" />
          </div>
          <span className="text-cyan-400 uppercase font-tech font-bold tracking-widest">
            RELIC INTERFACE SYSTEM // COGNITIVE CORE
          </span>
          <span className="hidden md:inline text-cyber-muted">
            | AGENT: 7702-LOCAL
          </span>
        </div>

        {/* Contador de páginas / sesiones estilo "08 / 18 PAGE" de la Imagen 1 */}
        <div className="flex items-center space-x-2.5">
          <span className="font-tech font-black text-white tracking-widest text-[11px]">
            {currentNum} / {totalNum} <span className="text-cyan-400">SESS</span>
          </span>
          {/* Barra de progreso de telemetría cian */}
          <div className="w-16 sm:w-24 h-1.5 bg-[#12141f] rounded-full overflow-hidden border border-cyan-500/30">
            <div
              className="h-full bg-cyan-400 shadow-sm shadow-cyan-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Fila principal con título, selector de nivel de seguridad y acciones */}
      <div className="flex items-center justify-between pt-0.5">
        {/* Lado izquierdo: Botón móvil + Título Kitsch / Cyberpunk */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 bg-[#12141f] border border-cyan-500/40 text-cyan-400 rounded transition-colors cursor-pointer"
            title="Abrir historial"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex items-center space-x-2 select-none">
            {/* Título en amarillo intenso estilo Imagen 1 */}
            <span className="font-tech font-black text-sm sm:text-base text-cyber-yellow uppercase tracking-wider">
              RELIC
            </span>
            <span className="font-tech font-bold text-xs sm:text-sm text-gray-300 uppercase tracking-widest hidden sm:inline">
              // STYLE OVER SUBSTANCE
            </span>
          </div>
        </div>

        {/* Centro / Derecha: Segmented Security Level Selector estilo Imagen 1 */}
        <div className="flex items-center space-x-2 sm:space-x-3 select-none">
          {/* Selector de nivel de seguridad [01] [02] [03] [04] */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-[#0f111a] px-2 py-1 rounded border border-cyber-border/80">
            <span className="text-[10px] text-cyber-muted uppercase font-bold mr-1">
              SEC LEVEL:
            </span>
            {[1, 2, 3, 4].map((lvl) => {
              const isSelected = securityLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => onSelectSecurityLevel?.(lvl)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-cyber-yellow text-black shadow-sm shadow-cyber-yellow/40'
                      : 'bg-black/40 text-cyber-muted hover:text-white hover:bg-white/10'
                  }`}
                  title={`Nivel de Razonamiento / Verificación: 0${lvl}`}
                >
                  0{lvl}
                </button>
              );
            })}
          </div>

          {/* Selector de Cartucho de Dominio RELIC */}
          <CartridgeSelector
            activeCartridgeId={activeCartridge}
            onSelectCartridge={onSelectCartridge}
          />

          {/* Botón Memoria Episódica */}
          {onOpenEpisodicMemory && (
            <button
              onClick={onOpenEpisodicMemory}
              className="flex items-center space-x-1 px-2.5 py-1 bg-black/40 hover:bg-cyber-yellow/15 border border-cyber-yellow/40 hover:border-cyber-yellow text-cyber-yellow rounded text-[11px] font-bold transition-all cursor-pointer shadow-sm shadow-cyber-yellow/10"
              title="Abrir registro de memoria episódica (episodic_log.relic)"
            >
              <Database className="w-3 h-3" />
              <span className="hidden sm:inline">EPISODIOS</span>
            </button>
          )}

          {/* Botón Nuevo Chat */}
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-950/40 hover:bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded text-[11px] font-bold transition-all cursor-pointer shadow-sm shadow-cyan-500/20"
              title="Iniciar nueva sesión"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">NUEVO CHAT</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
