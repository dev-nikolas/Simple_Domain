/**
 * Simple Domain — Vista de Fuentes de Datos (Data Intelligence)
 * Inspección completa de metadata de datasets (Benchmark, JSON, CSV). Menos de 180 líneas.
 */

import React, { useEffect, useState } from 'react';
import { Database, Plus, Trash2, RefreshCw, AlertCircle, FileSpreadsheet, ChevronDown, ChevronUp, Code2, ExternalLink } from 'lucide-react';
import { modularApi } from '../services/modularApi';
import { DataSource, DataSourceCreate } from '../types/modular';
import { DataSourceForm } from './components/DataSourceForm';
import { useRouter } from '../hooks/useRouter';

export const DataSourcesView: React.FC = () => {
  const { navigate } = useRouter();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const data = await modularApi.getDataSources();
      setSources(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar fuentes de datos');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (formData: DataSourceCreate) => {
    try {
      await modularApi.createDataSource(formData);
      setShowCreate(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar fuente');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar la fuente de datos "${name}"?`)) return;
    try {
      await modularApi.deleteDataSource(id);
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
              <Database className="w-5 h-5" />
              <span>CATÁLOGO DE FUENTES DE DATOS</span>
            </div>
            <p className="text-xs text-cyber-muted mt-1">
              Catálogo verificado de datasets (Benchmark S1, JSON Curricular y CSVs locales).
            </p>
          </div>
          <div className="flex space-x-2">
            <button onClick={loadData} className="p-2 border border-cyber-border bg-cyber-card hover:bg-cyber-yellow/10 text-cyber-muted hover:text-cyber-yellow cut-corner-sm cursor-pointer" title="Recargar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow text-cyber-yellow text-xs font-bold cut-corner-sm hover:bg-cyber-yellow hover:text-black cursor-pointer transition-all">
              <Plus className="w-4 h-4" /><span>REGISTRAR FUENTE</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-500/50 text-red-400 text-xs cut-corner-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1">{error}</span>
          </div>
        )}

        {showCreate && <DataSourceForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />}

        {loading && sources.length === 0 ? (
          <div className="text-center py-12 text-cyber-muted text-xs">Cargando catálogo...</div>
        ) : sources.length === 0 ? (
          <div className="text-center py-12 border border-cyber-border/40 bg-cyber-card/30 p-8 cut-corner-sm">
            <FileSpreadsheet className="w-8 h-8 text-cyber-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs text-cyber-muted">No hay fuentes registradas en el catálogo local.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sources.map((src) => {
              const isExpanded = expandedId === src.id;
              const meta = src.metadata || {};
              return (
                <div key={src.id} className="p-4 bg-cyber-card/60 border border-cyber-border hover:border-cyber-yellow/40 transition-colors cut-corner-sm space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-white text-xs font-bold">{src.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 uppercase font-bold">{src.format}</span>
                        <span className="text-[9px] px-1.5 py-0.5 border border-emerald-500/40 bg-emerald-950/20 text-emerald-400 uppercase font-bold">{src.status}</span>
                      </div>
                      {src.description && <p className="text-xs text-cyber-muted/90">{src.description}</p>}
                      <div className="text-[10px] text-cyber-muted/60 flex items-center space-x-3 pt-0.5">
                        <span>ID: <strong className="text-cyber-text">{src.id}</strong></span>
                        <span>URI: <strong className="text-cyber-yellow">{src.location || 'internal://'}</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 self-end md:self-center flex-wrap gap-y-1">
                      <button
                        onClick={() => navigate('/data-sources/' + src.id)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-cyber-yellow/15 border border-cyber-yellow/60 hover:border-cyber-yellow text-cyber-yellow text-[10px] cut-corner-xs transition-all cursor-pointer font-bold"
                        title="Ver dataset completo tal cual es"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>VER DATASET COMPLETO</span>
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : src.id)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-cyber-card border border-cyber-border hover:border-cyber-yellow text-cyber-yellow text-[10px] cut-corner-xs transition-all cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'OCULTAR' : 'METADATA'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button onClick={() => handleDelete(src.id, src.name)} className="p-1.5 text-cyber-muted hover:text-red-400 border border-cyber-border hover:border-red-500/40 cursor-pointer" title="Eliminar registro">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Panel Desplegable con Metadatos e Información Adicional */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-cyber-border/40 text-[10px] space-y-2 bg-black/40 p-3 cut-corner-xs animate-fadeIn">
                      <div className="flex items-center justify-between text-cyber-yellow font-bold uppercase tracking-wider">
                        <span>FICHA TÉCNICA Y ESQUEMA DEL DATASET</span>
                        <span className="text-cyber-muted">REGISTRADO: {new Date(src.created_at).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                        <div className="p-2 border border-cyber-border/40 bg-cyber-card/40">
                          <span className="text-cyber-muted block text-[9px]">FORMATO</span>
                          <span className="text-cyan-300 font-bold uppercase">{src.format}</span>
                        </div>
                        <div className="p-2 border border-cyber-border/40 bg-cyber-card/40">
                          <span className="text-cyber-muted block text-[9px]">ESTADO</span>
                          <span className="text-emerald-400 font-bold uppercase">{src.status}</span>
                        </div>
                        <div className="p-2 border border-cyber-border/40 bg-cyber-card/40">
                          <span className="text-cyber-muted block text-[9px]">UBICACIÓN</span>
                          <span className="text-cyber-text truncate block">{src.location || 'Local Storage'}</span>
                        </div>
                        <div className="p-2 border border-cyber-border/40 bg-cyber-card/40">
                          <span className="text-cyber-muted block text-[9px]">CAMPOS DETECTADOS</span>
                          <span className="text-cyber-yellow font-bold">{Object.keys(meta).length} propiedades</span>
                        </div>
                      </div>
                      {Object.keys(meta).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-cyber-muted block font-bold">METADATA ESTRUCTURADA (JSON):</span>
                          <pre className="text-emerald-300 p-2 bg-black/70 border border-cyber-border/50 text-[10px] overflow-x-auto whitespace-pre-wrap font-mono">
                            {JSON.stringify(meta, null, 2)}
                          </pre>
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
    </div>
  );
};
