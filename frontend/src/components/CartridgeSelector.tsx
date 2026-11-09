/**
 * Simple Domain — Selector de Cartuchos Cognitivos RELIC (HUD Cyberpunk)
 * Principio de Responsabilidad Única (SRP): Selección de modelo/cartucho activo estilo Gemini.
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, Layers } from 'lucide-react';

export interface CartridgeInfo {
  id: string;
  name: string;
  domain: string;
  loraActive: boolean;
  kbDocs: number;
  description: string;
}

export const AVAILABLE_CARTRIDGES: CartridgeInfo[] = [
  {
    id: 'auto',
    name: 'Auto // Router',
    domain: 'Dinámico',
    loraActive: true,
    kbDocs: 154,
    description: 'Enrutamiento dinámico automático según la consulta.',
  },
  {
    id: 'sistemas',
    name: 'Sistemas // Kernel',
    domain: 'C / POSIX / Kernel',
    loraActive: true,
    kbDocs: 82,
    description: 'Optimización de bajo nivel, memoria y arquitectura.',
  },
  {
    id: 'ciberseguridad',
    name: 'Ciber // Reversing',
    domain: 'Seguridad / Exploits',
    loraActive: true,
    kbDocs: 48,
    description: 'Desofuscación, análisis de payloads y mitigaciones.',
  },
  {
    id: 'gis_datos',
    name: 'GIS // Datos',
    domain: 'Topología & Grafos',
    loraActive: true,
    kbDocs: 24,
    description: 'Cálculo espacial, grafos y análisis relacional.',
  },
];

interface CartridgeSelectorProps {
  activeCartridgeId?: string;
  onSelectCartridge?: (id: string) => void;
  dropUp?: boolean;
  variant?: 'navbar' | 'input';
}

export const CartridgeSelector: React.FC<CartridgeSelectorProps> = ({
  activeCartridgeId = 'auto',
  onSelectCartridge,
  dropUp = false,
  variant = 'input',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = AVAILABLE_CARTRIDGES.find((c) => c.id === activeCartridgeId) || AVAILABLE_CARTRIDGES[0];
  const isNavbar = variant === 'navbar';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative font-mono select-none">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          isNavbar
            ? 'flex items-center space-x-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-full text-xs text-gray-300 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-gray-700'
            : 'flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 bg-[#101117] hover:bg-[#181a24] border border-[#232736] hover:border-cyber-red text-gray-200 hover:text-white rounded-lg text-xs transition-all cursor-pointer shadow-sm'
        }
        title="Seleccionar Cartucho de Dominio RELIC"
      >
        <Layers className="w-3.5 h-3.5 text-cyber-red" />
        <span className="font-bold text-xs text-gray-200">{current.name.split(' // ')[0]}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute ${isNavbar ? 'left-0' : 'right-0'} w-64 bg-[#0c0d15] border border-cyber-red/80 rounded-md p-2 z-[100] shadow-[0_16px_40px_rgba(0,0,0,0.95)] animate-in fade-in zoom-in-95 duration-150 ${
              dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <div className="px-2 py-1 border-b border-[#232736] text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>SELECCIONAR CARTUCHO</span>
              <span className="text-cyber-red">LORA+KB</span>
            </div>

            <div className="space-y-1">
              {AVAILABLE_CARTRIDGES.map((cartridge) => {
                const isSelected = cartridge.id === activeCartridgeId;
                return (
                  <button
                    key={cartridge.id}
                    type="button"
                    onClick={() => {
                      onSelectCartridge?.(cartridge.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-red-950/40 border-cyber-red text-white shadow-sm'
                        : 'bg-black/40 border-transparent hover:border-[#232736] hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isSelected ? 'text-red-300' : 'text-gray-200'}>
                        {cartridge.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyber-red" />}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                      {cartridge.description}
                    </p>
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
