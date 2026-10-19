/**
 * Simple Domain — Vista de Análisis con Brain Engine
 */

import React, { useEffect, useState } from 'react';
import { Cpu, History, AlertCircle, RefreshCw } from 'lucide-react';
import { AnalysisRecord } from '../types/modular';
import { modularApi } from '../services/modularApi';
import { AnalysisUploadForm } from './components/AnalysisUploadForm';
import { AnalysisResultCard } from './components/AnalysisResultCard';

export const AnalysisView: React.FC = () => {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setFetchingHistory(true);
      setError(null);
      const records = await modularApi.getAnalyses();
      setHistory(records);
      if (records.length > 0 && !selectedRecord) {
        setSelectedRecord(records[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar historial de análisis.');
    } finally {
      setFetchingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleAnalyze = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      const newRecord = await modularApi.uploadAndAnalyze(file);
      setSelectedRecord(newRecord);
      setHistory((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fallo en la ejecución del análisis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto font-mono text-cyber-text">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyber-yellow" />
            <h1 className="text-lg font-bold text-white tracking-widest uppercase">MOTOR BRAIN // ANÁLISIS DE DATOS</h1>
          </div>
          <p className="text-xs text-cyber-muted mt-1">
            Ingesta determinista, normalización y extracción de patrones matemáticos numéricos.
          </p>
        </div>
        <button
          onClick={loadHistory}
          disabled={fetchingHistory}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-card border border-cyber-border text-xs text-cyber-muted hover:text-white cut-corner-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetchingHistory ? 'animate-spin' : ''}`} />
          <span>ACTUALIZAR HISTORIAL</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs cut-corner-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Layout Grid: Left Form/History, Right Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <AnalysisUploadForm onAnalyze={handleAnalyze} loading={loading} />

          {/* History List */}
          <div className="bg-cyber-card border border-cyber-border cut-corner-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-cyber-border pb-2">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-cyber-yellow" />
                <span className="text-xs font-bold text-white uppercase">ANÁLISIS GUARDADOS ({history.length})</span>
              </div>
              <span className="text-[10px] text-cyber-muted">Persistidos en storage</span>
            </div>

            {fetchingHistory && history.length === 0 ? (
              <div className="text-center py-6 text-xs text-cyber-muted animate-pulse">Cargando registros...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-xs text-cyber-muted">No hay análisis persistidos aún. Sube un archivo para comenzar.</div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {history.map((rec) => {
                  const isSelected = selectedRecord?.id === rec.id;
                  return (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedRecord(rec)}
                      className={`w-full text-left p-2.5 transition-all cut-corner-sm border ${
                        isSelected
                          ? 'bg-cyber-yellow/10 border-cyber-yellow/60 text-white'
                          : 'bg-cyber-bg/60 border-cyber-border/70 text-cyber-muted hover:text-white hover:border-cyber-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{rec.filename}</span>
                        <span className="text-[9px] px-1.5 py-0.2 border border-cyber-border text-cyber-yellow uppercase">
                          {rec.format}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-cyber-muted mt-1">
                        <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                        <span>{rec.result?.total_series_analyzed ?? 0} series analizadas</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Selected Result View */}
        <div className="lg:col-span-7">
          {loading ? (
            <div className="p-12 bg-cyber-card border border-cyber-border cut-corner-sm text-center space-y-3">
              <Cpu className="w-10 h-10 text-cyber-yellow animate-spin mx-auto" />
              <p className="text-xs font-bold text-white tracking-widest">MOTOR BRAIN EJECUTANDO PROCESAMIENTO...</p>
              <p className="text-[11px] text-cyber-muted">Validando tipos, extrayendo diferencias y calculando métricas reales</p>
            </div>
          ) : selectedRecord ? (
            <AnalysisResultCard record={selectedRecord} />
          ) : (
            <div className="p-12 bg-cyber-card border border-cyber-border cut-corner-sm text-center text-cyber-muted text-xs">
              Selecciona o procesa un archivo para visualizar la evidencia matemática y patrones detectados.
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
