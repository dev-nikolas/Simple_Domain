/**
 * Simple Domain — Vista de Investigación (Research Lab & Sandbox Lab)
 * Inspección completa de metadata y notas experimentales. Menos de 180 líneas.
 */

import React, { useEffect, useState } from 'react';
import { FlaskConical, Plus, Trash2, RefreshCw, AlertCircle, Box, MessageSquare, ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { modularApi } from '../services/modularApi';
import { Experiment, ExperimentCreate } from '../types/modular';
import { ExperimentForm } from './components/ExperimentForm';
import { SandboxLab } from './components/SandboxLab';
import { ChatInfluenceViewer } from './components/ChatInfluenceViewer';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const ResearchView: React.FC = () => {
  const [tab, setTab] = useState<'experiments' | 'sandbox' | 'chats'>('sandbox');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const data = await modularApi.getExperiments();
      setExperiments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar experimentos');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (formData: ExperimentCreate) => {
    try {
      setError(null);
      const created = await modularApi.createExperiment(formData);
      setShowCreate(false);
      setTab('experiments');
      setExperiments((prev) => [created, ...prev.filter((x) => x.id !== created.id)]);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar experimento');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`¿Eliminar el experimento "${title}"?`)) return;
    try {
      await modularApi.deleteExperiment(id);
      setExperiments((prev) => prev.filter((x) => x.id !== id));
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto font-mono text-cyber-text">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-cyber-border pb-4">
          <div>
            <div className="flex items-center space-x-2 text-cyber-yellow text-sm font-bold tracking-wider">
              <FlaskConical className="w-5 h-5" />
              <span>LABORATORIO DE INVESTIGACIÓN</span>
            </div>
            <p className="text-xs text-cyber-muted mt-1">Registro de hipótesis experimentales y sandbox curricular.</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={loadData} className="p-2 border border-cyber-border bg-cyber-card text-cyber-muted hover:text-cyber-yellow cut-corner-sm cursor-pointer" title="Recargar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => { setTab('experiments'); setShowCreate(true); }} className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow text-cyber-yellow text-xs font-bold cut-corner-sm hover:bg-cyber-yellow hover:text-black cursor-pointer transition-all">
              <Plus className="w-4 h-4" /><span>NUEVO EXPERIMENTO</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-4 border-b border-cyber-border text-xs font-bold overflow-x-auto">
          <button onClick={() => setTab('sandbox')} className={`pb-2 flex items-center space-x-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${tab === 'sandbox' ? 'border-cyber-yellow text-cyber-yellow' : 'border-transparent text-cyber-muted hover:text-cyber-text'}`}>
            <Box className="w-4 h-4" /><span>SANDBOX LAB (CURRÍCULO)</span>
          </button>
          <button onClick={() => setTab('chats')} className={`pb-2 flex items-center space-x-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${tab === 'chats' ? 'border-cyber-yellow text-cyber-yellow' : 'border-transparent text-cyber-muted hover:text-cyber-text'}`}>
            <MessageSquare className="w-4 h-4" /><span>SONDEO DE CHATS // RELIC</span>
          </button>
          <button onClick={() => setTab('experiments')} className={`pb-2 flex items-center space-x-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${tab === 'experiments' ? 'border-cyber-yellow text-cyber-yellow' : 'border-transparent text-cyber-muted hover:text-cyber-text'}`}>
            <FlaskConical className="w-4 h-4" /><span>EXPERIMENTOS ({experiments.length})</span>
          </button>
        </div>

        {tab === 'sandbox' ? (
          <ErrorBoundary fallbackTitle="Error al visualizar Sandbox Lab"><SandboxLab /></ErrorBoundary>
        ) : tab === 'chats' ? (
          <ErrorBoundary fallbackTitle="Error al visualizar Sondeo de Chats"><ChatInfluenceViewer /></ErrorBoundary>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-500/50 text-red-400 text-xs cut-corner-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1">{error}</span>
              </div>
            )}
            {showCreate && <ExperimentForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />}
            {loading && experiments.length === 0 ? (
              <div className="text-center py-12 text-cyber-muted text-xs">Cargando experimentos...</div>
            ) : experiments.length === 0 ? (
              <div className="text-center py-12 border border-cyber-border/40 bg-cyber-card/30 p-8 cut-corner-sm">
                <FlaskConical className="w-8 h-8 text-cyber-muted mx-auto mb-2 opacity-40" />
                <p className="text-xs text-cyber-muted">No hay investigaciones registradas todavía.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {experiments.map((exp) => {
                  const isExp = expandedId === exp.id;
                  const meta = exp.metadata || {};
                  return (
                    <div key={exp.id} className="p-4 bg-cyber-card/60 border border-cyber-border hover:border-cyber-yellow/40 cut-corner-sm space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-white text-xs font-bold">{exp.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 border border-cyber-yellow/30 bg-cyber-yellow/10 text-cyber-yellow uppercase font-bold">{exp.status}</span>
                          </div>
                          {exp.hypothesis && <p className="text-xs text-cyber-muted/90"><span className="text-cyber-yellow/70">Hipótesis:</span> {exp.hypothesis}</p>}
                          <div className="text-[10px] text-cyber-muted/60 flex items-center space-x-3">
                            <span>ID: <strong className="text-cyber-text">{exp.id}</strong></span>
                            <span>Creado: {new Date(exp.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => setExpandedId(isExp ? null : exp.id)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-cyber-card border border-cyber-border hover:border-cyber-yellow text-cyber-yellow text-[10px] cut-corner-xs transition-all cursor-pointer"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            <span>{isExp ? 'OCULTAR DETALLES' : 'VER INFORMACIÓN ADICIONAL'}</span>
                            {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <button onClick={() => handleDelete(exp.id, exp.title)} className="p-1.5 text-cyber-muted hover:text-red-400 border border-cyber-border hover:border-red-500/40 cursor-pointer" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isExp && (
                        <div className="pt-3 border-t border-cyber-border/40 text-[10px] space-y-2 bg-black/40 p-3 cut-corner-xs animate-fadeIn">
                          {exp.description && (
                            <div>
                              <span className="text-cyber-yellow block font-bold mb-0.5">DESCRIPCIÓN DEL EXPERIMENTO:</span>
                              <p className="text-cyber-muted text-[11px] leading-relaxed">{exp.description}</p>
                            </div>
                          )}
                          {exp.notes && (
                            <div>
                              <span className="text-cyan-300 block font-bold mb-0.5">NOTAS METODOLÓGICAS:</span>
                              <p className="text-cyber-muted/90 text-[10px] leading-relaxed bg-black/50 p-2 border border-cyber-border/40">{exp.notes}</p>
                            </div>
                          )}
                          {Object.keys(meta).length > 0 && (
                            <div>
                              <span className="text-[10px] text-cyber-muted block font-bold mb-0.5">METADATA TÉCNICA:</span>
                              <pre className="text-emerald-300 p-2 bg-black/70 border border-cyber-border/50 text-[10px] overflow-x-auto whitespace-pre-wrap font-mono">{JSON.stringify(meta, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
