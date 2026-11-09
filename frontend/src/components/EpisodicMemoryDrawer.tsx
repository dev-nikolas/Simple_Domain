/**
 * Simple Domain — Cajón HUD de Memoria Episódica RELIC (episodic_log.relic)
 * Principio de Responsabilidad Única y Composición.
 */

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Plus, Database, RefreshCw } from 'lucide-react';
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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0b0c14]/95 border-l border-cyber-yellow/60 h-full flex flex-col shadow-2xl shadow-cyber-yellow/20 z-50 backdrop-blur-xl animate-in slide-in-from-right duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-border/70 bg-gradient-to-r from-cyber-yellow/10 to-transparent">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-cyber-card border border-cyber-yellow/50 rounded cut-corner-xs">
              <Database className="w-4 h-4 text-cyber-yellow animate-pulse" />
            </div>
            <div>
              <h2 className="font-tech text-base font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <span>MEMORIA EPISÓDICA RELIC</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-cyber-yellow text-black font-bold rounded">
                  LOG.RELIC
                </span>
              </h2>
              <p className="text-[10px] text-cyber-muted">Reglas aprendidas (§6 Hardening)</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={fetchMemories} className="p-1.5 text-cyber-muted hover:text-cyan-400 cursor-pointer" title="Refrescar">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 text-cyber-muted hover:text-cyber-yellow cursor-pointer" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-4 py-2 border-b border-cyber-border/40 bg-black/40 flex items-center justify-between text-xs">
          <span className="text-cyber-muted text-[11px]">{memories.length} reglas activas en contexto</span>
          <button
            onClick={() => setIsAdding((prev) => !prev)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-cyber-yellow/10 hover:bg-cyber-yellow/20 border border-cyber-yellow/50 text-cyber-yellow rounded text-[11px] font-bold cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>{isAdding ? 'CANCELAR' : 'APRENDER REGLA'}</span>
          </button>
        </div>

        {/* Formulario */}
        {isAdding && <EpisodicRuleForm isLoading={isLoading} onSubmit={handleAddRule} />}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {memories.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-cyber-muted">
              <BookOpen className="w-8 h-8 mb-2 opacity-40 text-cyber-yellow" />
              <p className="text-xs">No hay episodios registrados aún.</p>
              <p className="text-[10px] mt-1 text-gray-500">RELIC los consolidará automáticamente al verificar hipótesis.</p>
            </div>
          ) : (
            memories.map((rule) => <EpisodicRuleItem key={rule.id} rule={rule} onDelete={handleDeleteRule} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodicMemoryDrawer;
