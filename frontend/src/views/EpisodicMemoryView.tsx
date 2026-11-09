/**
 * Simple Domain — Vista Completa de Memoria Episódica (Página /memory-episodic)
 * Principio de Responsabilidad Única (SRP): Gestión visual integral de reglas aprendidas RELIC.
 */

import React, { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, ArrowLeft, Search } from 'lucide-react';
import { getEpisodicMemories, recordEpisodicMemory, deleteEpisodicMemory } from '../services/relicMemoryService';
import { EpisodicMemoryRule } from '../types/relic';
import { EpisodicRuleItem } from '../components/EpisodicRuleItem';
import { EpisodicRuleForm } from '../components/EpisodicRuleForm';

interface EpisodicMemoryViewProps {
  onBackToChat: () => void;
}

export const EpisodicMemoryView: React.FC<EpisodicMemoryViewProps> = ({ onBackToChat }) => {
  const [memories, setMemories] = useState<EpisodicMemoryRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const fetchMemories = async () => {
    setIsLoading(true);
    const data = await getEpisodicMemories();
    setMemories(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMemories();
  }, []);

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

  const filteredMemories = memories.filter((m) =>
    m.topic.toLowerCase().includes(search.toLowerCase()) ||
    m.conclusion.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto bg-[#050508] p-4 sm:p-8 font-mono select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Barra superior de navegación y título */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232736] pb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToChat}
              className="p-2 bg-[#101117] hover:bg-[#1a1b24] border border-[#232736] hover:border-cyber-red text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-2 text-xs font-bold"
              title="Volver a la conversación principal"
            >
              <ArrowLeft className="w-4 h-4 text-cyber-red" />
              <span>VOLVER</span>
            </button>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-[#101117] border border-cyber-red/50 rounded-lg">
                <Database className="w-5 h-5 text-cyber-red animate-pulse" />
              </div>
              <div>
                <h1 className="font-tech text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <span>MEMORIA EPISÓDICA RELIC</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-cyber-red text-white font-bold rounded">
                    LOG.RELIC
                  </span>
                </h1>
                <p className="text-xs text-gray-500">Reglas persistidas y lecciones aprendidas</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchMemories}
              disabled={isLoading}
              className="p-2 bg-[#101117] hover:bg-[#181922] border border-[#232736] hover:border-cyber-red text-gray-400 hover:text-white rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5"
              title="Refrescar memoria"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">REFRESCAR</span>
            </button>
            <button
              onClick={() => setIsAdding((prev) => !prev)}
              className="px-3 py-2 bg-cyber-red hover:bg-cyber-red-bright text-white text-xs rounded-lg transition-colors font-bold cursor-pointer flex items-center space-x-1.5 shadow-sm shadow-cyber-red/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'CANCELAR' : 'NUEVA REGLA'}</span>
            </button>
          </div>
        </div>

        {/* Formulario desplegable si isAdding */}
        {isAdding && (
          <div className="border border-cyber-red/40 rounded-xl overflow-hidden shadow-xl shadow-red-950/20 animate-in fade-in zoom-in-95 duration-150">
            <EpisodicRuleForm isLoading={isLoading} onSubmit={handleAddRule} />
          </div>
        )}

        {/* Buscador de reglas */}
        <div className="flex items-center justify-between gap-4 bg-[#0a0b10] border border-[#232736] rounded-lg px-3 py-2">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar reglas por tópico o lección aprendida..."
              className="bg-transparent text-xs text-white placeholder-gray-500 outline-none w-full"
            />
          </div>
          <span className="text-[11px] text-gray-500 font-bold uppercase shrink-0">
            {filteredMemories.length} / {memories.length} REGLAS
          </span>
        </div>

        {/* Lista / Grid de Reglas */}
        {filteredMemories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredMemories.map((rule) => (
              <EpisodicRuleItem key={rule.id} rule={rule} onDelete={handleDeleteRule} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-[#232736] rounded-xl bg-[#090a10]/50 space-y-2">
            <Database className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-xs text-gray-400 font-bold">
              {search ? 'No se encontraron reglas coincidentes' : 'Sin reglas consolidadas en episodic_log.relic'}
            </p>
            <p className="text-[11px] text-gray-600 max-w-sm mx-auto">
              Las conclusiones verificadas por los cartuchos de RELIC se consolidan aquí de manera permanente.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default EpisodicMemoryView;

