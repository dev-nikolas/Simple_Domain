/**
 * Simple Domain — Vista de Patrones (Pattern Catalog)
 * Catálogo dinámico de patrones y conclusiones deducidas por RELIC.
 * Menos de 180 líneas. Cero valores hardcodeados.
 */

import React, { useEffect, useState } from 'react';
import { Network, Plus, Trash2, RefreshCw, AlertCircle, Cpu, ArrowUpRight } from 'lucide-react';
import { modularApi } from '../services/modularApi';
import { DataSource, Pattern, PatternCreate } from '../types/modular';
import { PatternForm } from './components/PatternForm';
import { useRouter } from '../hooks/useRouter';

export const PatternsView: React.FC = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'engine' | 'manual'>('all');
  const { navigate } = useRouter();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [patternsRes, sourcesRes] = await Promise.allSettled([
        modularApi.getPatterns(),
        modularApi.getDataSources(),
      ]);
      if (patternsRes.status === 'rejected') {
        const msg = patternsRes.reason instanceof Error ? patternsRes.reason.message : 'Error al cargar patrones';
        throw new Error(msg);
      }
      setPatterns(patternsRes.value);
      setSources(sourcesRes.status === 'fulfilled' ? sourcesRes.value : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar patrones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (formData: PatternCreate) => {
    try {
      await modularApi.createPattern(formData);
      setShowCreate(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar patrón');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar la deducción/patrón "${name}"?`)) return;
    try {
      await modularApi.deletePattern(id);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const filteredPatterns = patterns.filter((p) => {
    if (filterOrigin === 'engine') return p.origin === 'engine';
    if (filterOrigin === 'manual') return p.origin === 'manual';
    return true;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto font-mono text-cyber-text">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-cyber-border pb-4">
          <div>
            <div className="flex items-center space-x-2 text-cyber-yellow text-sm font-bold tracking-wider">
              <Network className="w-5 h-5" />
              <span>PATRONES Y CONCLUSIONES DEDUCIDAS POR RELIC</span>
            </div>
            <p className="text-xs text-cyber-muted mt-1">
              Catálogo dinámico de relaciones y conclusiones inferidas por el motor RELIC. Cero datos hardcodeados.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadData}
              className="p-2 border border-cyber-border bg-cyber-card hover:bg-cyber-yellow/10 text-cyber-muted hover:text-cyber-yellow cut-corner-sm cursor-pointer"
              title="Recargar deducciones"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow text-cyber-yellow text-xs font-bold cut-corner-sm hover:bg-cyber-yellow hover:text-black cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>REGISTRAR HIPÓTESIS</span>
            </button>
          </div>
        </div>

        {/* Filtros dinámicos por origen */}
        <div className="flex items-center space-x-2 text-xs border-b border-cyber-border pb-2">
          <span className="text-[10px] text-cyber-muted uppercase mr-1">ORIGEN:</span>
          {(['all', 'engine', 'manual'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterOrigin(mode)}
              className={`px-2.5 py-1 cut-corner-xs border text-[10px] font-bold cursor-pointer transition-all ${
                filterOrigin === mode
                  ? 'bg-cyber-yellow/20 border-cyber-yellow text-cyber-yellow'
                  : 'border-cyber-border/60 bg-cyber-card text-cyber-muted hover:text-white'
              }`}
            >
              {mode === 'all' ? `TODOS (${patterns.length})` : mode === 'engine' ? 'MOTOR RELIC' : 'MANUAL'}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-500/50 text-red-400 text-xs cut-corner-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {showCreate && (
          <PatternForm sources={sources} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        )}

        {loading && patterns.length === 0 ? (
          <div className="text-center py-12 text-cyber-muted text-xs">Consultando inferencias de RELIC...</div>
        ) : filteredPatterns.length === 0 ? (
          <div className="text-center py-12 border border-cyber-border/40 bg-cyber-card/30 p-8 cut-corner-sm space-y-3">
            <Cpu className="w-10 h-10 text-cyber-yellow/60 mx-auto animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Sin conclusiones relacionales registradas todavía
            </h3>
            <p className="text-[11px] text-cyber-muted max-w-md mx-auto">
              RELIC deduce patrones de forma viva. Inicia una consulta en el Chat o ejecuta un episodio en el Sandbox Lab para que el motor extraiga y verifique conclusiones automáticamente.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-yellow/15 border border-cyber-yellow/60 hover:border-cyber-yellow text-cyber-yellow text-xs font-bold cut-corner-sm cursor-pointer transition-all hover:bg-cyber-yellow/30"
            >
              <span>IR AL CHAT Y CONSULTAR A RELIC</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredPatterns.map((pat) => (
              <div
                key={pat.id}
                className="p-4 bg-cyber-card/60 border border-cyber-border hover:border-cyber-yellow/40 transition-colors cut-corner-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-xs font-bold truncate">{pat.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 uppercase font-bold">
                      {pat.pattern_type}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 border uppercase font-bold ${
                      pat.origin === 'engine'
                        ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                        : 'border-amber-500/40 bg-amber-950/30 text-amber-400'
                    }`}>
                      {pat.origin === 'engine' ? 'MOTOR RELIC' : 'MANUAL'}
                    </span>
                  </div>
                  {pat.description && <p className="text-xs text-cyber-muted truncate">{pat.description}</p>}
                  <p className="text-[10px] text-cyber-muted/50 truncate">
                    ID: {pat.id} · Estado: {pat.status} · Creado: {new Date(pat.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(pat.id, pat.name)}
                  className="p-1.5 text-cyber-muted hover:text-red-400 border border-cyber-border hover:border-red-500/40 shrink-0 self-end md:self-center cursor-pointer"
                  title="Eliminar deducción"
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
