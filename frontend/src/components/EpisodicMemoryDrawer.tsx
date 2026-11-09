/**
 * Simple Domain — Cajón HUD de Memoria Episódica RELIC (episodic_log.relic)
 * Principio de Responsabilidad Única y Composición.
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Database, RefreshCw } from 'lucide-react';
import { getEpisodicMemories, recordEpisodicMemory, deleteEpisodicMemory } from '../services/relicMemoryService';
import { EpisodicMemoryRule } from '../types/relic';
import { EpisodicRuleItem } from './EpisodicRuleItem';
import { EpisodicRuleForm } from './EpisodicRuleForm';

interface EpisodicMemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EpisodicMemoryDrawer: React.FC<EpisodicMemoryDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [memories, setMemories] = useState<EpisodicMemoryRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const fetchMemories = async () => {
    setIsLoading(true);
    const data = await getEpisodicMemories();
    setMemories(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchMemories();
  }, [isOpen]);

  const handleAddRule = async (topic: string, conclusion: string) => {
    setIsLoading(true);
    const created = await recordEpisodicMemory(topic, conclusion);
    if (created) {
      setIsAdding(false);
      await fetchMemories();
    }
    setIsLoading(false);
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('¿Eliminar esta regla de la memoria episódica permanente?')) return;
    setIsLoading(true);
    await deleteEpisodicMemory(id);
    await fetchMemories();
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-mono select-none">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#08080d]/98 border-l border-cyber-red/50 h-full flex flex-col shadow-2xl shadow-red-950/40 z-50 backdrop-blur-xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#232736] bg-gradient-to-r from-red-950/20 to-transparent">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#101117] border border-cyber-red/50 rounded">
              <Database className="w-4 h-4 text-cyber-red animate-pulse" />
            </div>
            <div>
              <h2 className="font-tech text-base font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <span>MEMORIA EPISÓDICA RELIC</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-cyber-red text-white font-bold rounded">
                  LOG.RELIC
                </span>
              </h2>
              <p className="text-[10px] text-gray-500">Reglas aprendidas y persistidas</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={fetchMemories} className="p-1.5 text-gray-400 hover:text-white cursor-pointer" title="Refrescar">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white cursor-pointer" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-[#232736] flex items-center justify-between bg-black/40">
          <span className="text-xs text-gray-400 font-bold uppercase">
            REGLAS ({memories.length})
          </span>
          <button
            onClick={() => setIsAdding((prev) => !prev)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-cyber-red hover:bg-cyber-red-bright text-white text-xs rounded transition-colors font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'CANCELAR' : 'NUEVA REGLA'}</span>
          </button>
        </div>

        {isAdding && <EpisodicRuleForm isLoading={isLoading} onSubmit={handleAddRule} />}

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {memories.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              Sin reglas consolidadas en episodic_log.relic
            </div>
          ) : (
            memories.map((rule) => (
              <EpisodicRuleItem key={rule.id} rule={rule} onDelete={handleDeleteRule} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodicMemoryDrawer;
