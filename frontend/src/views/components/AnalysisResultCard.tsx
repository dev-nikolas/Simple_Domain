/**
 * Simple Domain — Tarjeta de Resultados de Análisis de Brain
 */

import React from 'react';
import { TrendingUp, Minus, Activity, HelpCircle, AlertTriangle, Layers, Calendar } from 'lucide-react';
import { AnalysisRecord, PatternMatch } from '../../types/modular';

interface AnalysisResultCardProps {
  record: AnalysisRecord;
}

const getPatternBadge = (type: PatternMatch['pattern_type']) => {
  switch (type) {
    case 'arithmetic_progression':
      return { label: 'PROGRESIÓN ARITMÉTICA', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50', icon: TrendingUp };
    case 'constant':
      return { label: 'SECUENCIA CONSTANTE', color: 'bg-cyan-950/60 text-cyan-400 border-cyan-500/50', icon: Minus };
    case 'irregular_variation':
      return { label: 'VARIACIÓN IRREGULAR', color: 'bg-purple-950/60 text-purple-400 border-purple-500/50', icon: Activity };
    case 'insufficient_data':
    default:
      return { label: 'DATOS INSUFICIENTES', color: 'bg-amber-950/60 text-amber-400 border-amber-500/50', icon: HelpCircle };
  }
};

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({ record }) => {
  const { result } = record;

  return (
    <div className="bg-cyber-card border border-cyber-border cut-corner-sm p-5 space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-border pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-cyber-yellow tracking-wider uppercase">{record.filename}</h3>
            <span className="text-[10px] px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white uppercase">
              {record.format}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 uppercase">
              {record.status}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px] text-cyber-muted mt-1">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(record.created_at).toLocaleString()}</span>
            </span>
            <span>ID: {record.id.slice(0, 8)}...</span>
            <span>Motor: v{result.engine_version}</span>
          </div>
        </div>

        {/* Dataset Stats */}
        <div className="flex items-center space-x-3 text-xs bg-cyber-bg/70 px-3 py-1.5 border border-cyber-border cut-corner-sm">
          <div><span className="text-cyber-muted text-[10px]">FILAS: </span><span className="font-bold text-white">{result.summary.total_rows}</span></div>
          <div className="w-[1px] h-4 bg-cyber-border" />
          <div><span className="text-cyber-muted text-[10px]">COLS: </span><span className="font-bold text-white">{result.summary.total_columns}</span></div>
          <div className="w-[1px] h-4 bg-cyber-border" />
          <div><span className="text-cyber-muted text-[10px]">SERIES: </span><span className="font-bold text-cyber-yellow">{result.total_series_analyzed}</span></div>
        </div>
      </div>

      {/* Global Warnings */}
      {result.global_warnings.length > 0 && (
        <div className="space-y-1 p-3 bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs cut-corner-sm">
          {result.global_warnings.map((w, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Series Patterns */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-white">
          <Layers className="w-4 h-4 text-cyber-yellow" />
          <span>SERIES NUMÉRICAS Y PATRONES DETECTADOS ({result.patterns.length})</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {result.patterns.map((pat) => {
            const badge = getPatternBadge(pat.pattern_type);
            const Icon = badge.icon;
            const stats = pat.statistics;

            return (
              <div key={pat.series_name} className="p-4 bg-cyber-bg/80 border border-cyber-border cut-corner-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyber-border/60 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white uppercase">{pat.series_name}</span>
                    <span className="text-[10px] text-cyber-muted">
                      ({stats.count} valores calculados{typeof pat.evidence.excluded_count === 'number' && pat.evidence.excluded_count > 0 ? `, ${pat.evidence.excluded_count} excluidos` : ''})
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1.5 px-2.5 py-0.5 border text-[10px] font-bold cut-corner-sm ${badge.color}`}>
                    <Icon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </div>
                </div>

                <p className="text-xs text-cyber-muted">{pat.description}</p>

                {/* Evidence & Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-cyber-card/50 p-2.5 border border-cyber-border/40">
                  <div><span className="text-cyber-muted text-[10px] block">MÍN / MÁX</span><span className="text-white font-bold">{stats.min_value ?? 'N/A'} / {stats.max_value ?? 'N/A'}</span></div>
                  <div><span className="text-cyber-muted text-[10px] block">MEDIA</span><span className="text-white font-bold">{stats.mean !== null ? stats.mean.toFixed(2) : 'N/A'}</span></div>
                  <div><span className="text-cyber-muted text-[10px] block">DESV. ESTÁNDAR</span><span className="text-white font-bold">{stats.std_dev !== null ? stats.std_dev.toFixed(2) : 'N/A'}</span></div>
                  <div>
                    <span className="text-cyber-muted text-[10px] block">PARÁMETRO</span>
                    <span className="text-cyber-yellow font-bold">
                      {pat.parameters.step !== undefined ? `Paso: ${pat.parameters.step}` : pat.parameters.value !== undefined ? `Valor: ${pat.parameters.value}` : 'Variación libre'}
                    </span>
                  </div>
                </div>

                {/* Consecutive Diffs preview */}
                {stats.consecutive_diffs && stats.consecutive_diffs.length > 0 && (
                  <div className="text-[10px] text-cyber-muted truncate">
                    <span className="text-white font-semibold">Diferencias sucesivas: </span>
                    <span className="font-mono text-cyber-yellow/80">[{stats.consecutive_diffs.slice(0, 10).join(', ')}{stats.consecutive_diffs.length > 10 ? ', ...' : ''}]</span>
                  </div>
                )}

                {/* Warnings per series */}
                {pat.warnings.length > 0 && (
                  <div className="text-[10px] text-amber-400/90 space-y-0.5">
                    {pat.warnings.map((warn, i) => (
                      <div key={i} className="flex items-center space-x-1.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
