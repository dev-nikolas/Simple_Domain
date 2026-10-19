/**
 * Simple Domain — Vista de Fuentes de Datos (Data Intelligence)
 * Catálogo e inventario de datasets registrados localmente.
 */

import React, { useEffect, useState } from 'react';
import { Database, Plus, Trash2, RefreshCw, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { modularApi } from '../services/modularApi';
import { DataSource, DataSourceCreate } from '../types/modular';
import { DataSourceForm } from './components/DataSourceForm';

export const DataSourcesView: React.FC = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await modularApi.getDataSources();
      setSources(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar fuentes de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    if (!window.confirm(`¿Eliminar la fuente de datos "${name}" del catálogo?`)) return;
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
              Registro local de datasets en formatos CSV, JSON y Excel sin ingestión no verificada.
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
              <span>REGISTRAR FUENTE</span>
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
          <DataSourceForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {loading && sources.length === 0 ? (
          <div className="text-center py-12 text-cyber-muted text-xs">Cargando catálogo...</div>
        ) : error && sources.length === 0 ? (
          <div className="text-center py-10 border border-red-500/30 bg-red-950/20 p-6 cut-corner-sm space-y-2">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto opacity-80" />
            <p className="text-xs text-red-300 font-bold">Error al consultar el catálogo de fuentes</p>
            <p className="text-[11px] text-cyber-muted">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 px-3 py-1 bg-cyber-card border border-cyber-yellow/40 hover:bg-cyber-yellow/10 text-cyber-yellow text-xs cut-corner-sm cursor-pointer"
            >
              Reintentar conexión
            </button>
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-12 border border-cyber-border/40 bg-cyber-card/30 p-8 cut-corner-sm">
            <FileSpreadsheet className="w-8 h-8 text-cyber-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs text-cyber-muted">No hay fuentes registradas en el catálogo local.</p>
          </div>
        ) : (

          <div className="grid grid-cols-1 gap-3">
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-4 bg-cyber-card/60 border border-cyber-border hover:border-cyber-yellow/40 transition-colors cut-corner-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-xs font-bold truncate">{src.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 uppercase font-bold">
                      {src.format}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 border border-cyber-border text-cyber-muted uppercase">
                      {src.status}
                    </span>
                  </div>
                  {src.description && <p className="text-xs text-cyber-muted truncate">{src.description}</p>}
                  <p className="text-[10px] text-cyber-muted/50 truncate">
                    ID: {src.id} · Ubicación: {src.location || 'N/A'} · Registrado: {new Date(src.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(src.id, src.name)}
                  className="p-1.5 text-cyber-muted hover:text-red-400 border border-cyber-border hover:border-red-500/40 shrink-0 self-end md:self-center"
                  title="Eliminar registro"
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
