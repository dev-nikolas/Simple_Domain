/**
 * Simple Domain — Selector de Cartuchos Cognitivos RELIC (HUD Cyberpunk)
 * Inspirado en el sistema de menús de Cyberpunk 2077 (Image 1)
 * Permite seleccionar el dominio activo de LoRA + Base de Conocimiento BM25 (.kb.relic)
 */

import React, { useState } from 'react';
import { Cpu, ChevronDown, Check, Zap } from 'lucide-react';

export interface CartridgeInfo {
  id: string;
  name: string;
  domain: string;
  loraActive: boolean;
  kbDocs: number;
  description: string;
}

const AVAILABLE_CARTRIDGES: CartridgeInfo[] = [
  {
    id: 'auto',
    name: 'AUTO // ROUTER SEMÁNTICO',
    domain: 'Dinámico',
    loraActive: true,
    kbDocs: 154,
    description: 'Enrutamiento dinámico en microsegundos según la consulta del usuario.',
  },
  {
    id: 'sistemas',
    name: 'SISTEMAS // C & OS',
    domain: 'Kernel / C / Memoria',
    loraActive: true,
    kbDocs: 82,
    description: 'Especialista en optimizaciones de bajo nivel, gestión de memoria y POSIX.',
  },
  {
    id: 'ciberseguridad',
    name: 'CIBER // REVERSE & SEC',
    domain: 'Ingeniería Inversa',
    loraActive: true,
    kbDocs: 48,
    description: 'Análisis de payloads, desensamblado x86/ARM y rutinas de ofuscación.',
  },
  {
    id: 'gis_datos',
    name: 'GIS // GRAFOS & DATOS',
    domain: 'Geometría & Grafos',
    loraActive: true,
    kbDocs: 24,
    description: 'Estructuras topológicas, grafos de dependencias y cálculo determinista.',
  },
];

interface CartridgeSelectorProps {
  activeCartridgeId?: string;
  onSelectCartridge?: (id: string) => void;
}

export const CartridgeSelector: React.FC<CartridgeSelectorProps> = ({
  activeCartridgeId = 'auto',
  onSelectCartridge,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const current = AVAILABLE_CARTRIDGES.find((c) => c.id === activeCartridgeId) || AVAILABLE_CARTRIDGES[0];

  return (
    <div className="relative font-mono select-none">
      {/* Botón cápsula en la TopBar estilo Cyberpunk 2077 HUD */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2 px-2.5 py-1 bg-[#10121a]/90 hover:bg-[#151824] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded cut-corner-xs transition-all cursor-pointer shadow-sm shadow-cyan-500/20 text-[11px]"
        title="Seleccionar Cartucho de Dominio RELIC"
      >
        <Zap className="w-3 h-3 text-cyber-yellow animate-pulse" />
        <span className="font-tech font-bold uppercase tracking-wider text-white">
          CARTRIDGE:
        </span>
        <span className="text-cyber-yellow font-bold uppercase">
          {current.id}
        </span>
        <ChevronDown className="w-3 h-3 text-cyan-400" />
      </button>

      {/* Menú desplegable HUD */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#0c0d16]/95 border border-cyber-yellow/60 rounded-lg p-2 z-50 shadow-2xl shadow-cyber-yellow/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header del menú */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-cyber-border/60 text-[10px] text-cyber-muted mb-1.5">
              <span className="font-bold text-cyber-yellow uppercase tracking-wider flex items-center space-x-1">
                <Cpu className="w-3 h-3 text-cyber-yellow" />
                <span>CARTUCHOS DISPONIBLES</span>
              </span>
              <span className="text-[9px] bg-cyber-yellow/10 text-cyber-yellow px-1.5 py-0.2 rounded border border-cyber-yellow/30 font-bold">
                LORA + BM25
              </span>
            </div>

            {/* Lista de cartuchos */}
            <div className="space-y-1">
              {AVAILABLE_CARTRIDGES.map((cartridge) => {
                const isSelected = cartridge.id === activeCartridgeId;
                return (
                  <button
                    key={cartridge.id}
                    onClick={() => {
                      onSelectCartridge?.(cartridge.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyber-yellow/15 border-cyber-yellow text-white shadow-sm shadow-cyber-yellow/20'
                        : 'bg-black/30 border-transparent hover:border-cyan-500/40 hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={isSelected ? 'text-cyber-yellow' : 'text-cyan-400'}>
                        {cartridge.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyber-yellow" />}
                    </div>
                    <p className="text-[10px] text-cyber-muted mt-0.5 line-clamp-1">
                      {cartridge.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1.5 text-[9px] text-cyber-muted">
                      <span className="px-1 py-0.2 bg-white/5 rounded border border-white/10">
                        {cartridge.kbDocs} docs BM25
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        ● LoRA montado
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartridgeSelector;

