/**
 * Simple Domain — Vista de Investigación (Research Lab)
 * Gestión de experimentos e hipótesis con persistencia JSON.
 */

import React, { useEffect, useState } from 'react';
import { FlaskConical, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { modularApi } from '../services/modularApi';
import { Experiment, ExperimentCreate } from '../types/modular';
import { ExperimentForm } from './components/ExperimentForm';

export const ResearchView: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await modularApi.getExperiments();
      setExperiments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar experimentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (formData: ExperimentCreate) => {
    try {
      await modularApi.createExperiment(formData);
      setShowCreate(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar experimento');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`¿Eliminar el experimento "${title}"?`)) return;
    try {
      await modularApi.deleteExperiment(id);
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
            <p className="text-xs text-cyber-muted mt-1">
              Registro y trazabilidad de hipótesis experimentales y métricas locales.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadData}
              className="p-2 border border-cyber-border bg-cyber-card hover:bg-cyber-yellow/10 text-cyber-muted hover:text-cyber-yellow cut-corner-sm"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow text-cyber-yellow text-xs font-bold cut-corner-sm hover:bg-cyber-yellow hover:text-black transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>NUEVO EXPERIMENTO</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-500/50 text-red-400 text-xs cut-corner-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {showCreate && (
          <ExperimentForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {loading && experiments.length === 0 ? (
          <div className="text-center py-12 text-cyber-muted text-xs">Cargando experimentos...</div>
        ) : error && experiments.length === 0 ? (
          <div className="text-center py-10 border border-red-500/30 bg-red-950/20 p-6 cut-corner-sm space-y-2">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto opacity-80" />
            <p className="text-xs text-red-300 font-bold">Error al consultar el repositorio</p>
            <p className="text-[11px] text-cyber-muted">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 px-3 py-1 bg-cyber-card border border-cyber-yellow/40 hover:bg-cyber-yellow/10 text-cyber-yellow text-xs cut-corner-sm cursor-pointer"
            >
              Reintentar conexión
            </button>
          </div>
        ) : experiments.length === 0 ? (
          <div className="text-center py-12 border border-cyber-border/40 bg-cyber-card/30 p-8 cut-corner-sm">
            <FlaskConical className="w-8 h-8 text-cyber-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs text-cyber-muted">No hay investigaciones registradas todavía.</p>
          </div>
        ) : (

          <div className="grid grid-cols-1 gap-3">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                className="p-4 bg-cyber-card/60 border border-cyber-border hover:border-cyber-yellow/40 transition-colors cut-corner-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-xs font-bold truncate">{exp.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 border border-cyber-yellow/30 bg-cyber-yellow/10 text-cyber-yellow uppercase font-bold">
                      {exp.status}
                    </span>
                  </div>
                  {exp.hypothesis && (
                    <p className="text-xs text-cyber-muted/90 truncate">
                      <span className="text-cyber-yellow/70">Hipótesis:</span> {exp.hypothesis}
                    </p>
                  )}
                  <p className="text-[10px] text-cyber-muted/50">
                    ID: {exp.id} · Creado: {new Date(exp.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(exp.id, exp.title)}
                  className="p-1.5 text-cyber-muted hover:text-red-400 border border-cyber-border hover:border-red-500/40 shrink-0 self-end md:self-center"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
