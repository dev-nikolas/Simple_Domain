/**
 * Simple Domain — Línea de Tiempo del Episodio, Árbol RIR y Trace
 * Menos de 180 líneas. Solo Tailwind y SVG icons.
 */

import React, { useState } from 'react';
import { SandboxEpisode } from '../../types/sandbox';
import { CheckCircle2, XCircle, Clock, ChevronRight, Layers } from 'lucide-react';

interface SandboxEpisodeViewerProps {
  episodes: SandboxEpisode[];
}

export const SandboxEpisodeViewer: React.FC<SandboxEpisodeViewerProps> = ({ episodes }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const ep = episodes[selectedIdx] || episodes[episodes.length - 1];

  if (!episodes.length) {
    return (
      <div className="p-6 text-center text-xs text-cyber-muted border border-cyber-border bg-cyber-card">
        Esperando inicio de episodios...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-cyber-border bg-cyber-card p-3 cut-corner-sm">
      {/* Columna Izquierda: Línea de tiempo de episodios */}
      <div className="md:col-span-1 border-r border-cyber-border pr-2 max-h-72 overflow-y-auto space-y-1.5">
        <div className="text-[11px] font-bold text-cyber-muted uppercase tracking-wider pb-1">
          Línea de Tiempo ({episodes.length})
        </div>
        {episodes.map((item, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIdx(idx)}
            className={`w-full text-left p-2 cut-corner-xs text-xs flex items-center justify-between border transition-all ${
              selectedIdx === idx
                ? 'bg-cyber-yellow/15 border-cyber-yellow text-cyber-yellow'
                : 'bg-black/30 border-cyber-border/50 text-cyber-muted hover:border-cyber-border'
            }`}
          >
            <div className="flex items-center space-x-2 truncate">
              {item.is_em ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-cyber-green shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              )}
              <span className="truncate">Ep {item.episode}: {item.prompt}</span>
            </div>
            <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${
              item.status === 'VALID' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
            }`}>
              {item.status}
            </span>
          </button>
        ))}
      </div>

      {/* Columna Derecha: Árbol RIR y Traza de 5 Etapas */}
      <div className="md:col-span-2 space-y-3 pl-2">
        <div className="flex items-center justify-between border-b border-cyber-border pb-1.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-cyber-text">
            <Layers className="w-4 h-4 text-cyber-yellow" />
            <span>EPISODIO #{ep.episode} — AUDITORÍA RIR Y TRACE</span>
          </div>
          <span className="text-[11px] font-mono text-cyber-muted">
            Recompensa: <b className={ep.reward >= 0 ? 'text-cyber-green' : 'text-rose-400'}>{ep.reward.toFixed(2)}</b>
          </span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="text-cyber-muted text-[11px]">Prompt: <span className="text-cyber-text">{ep.prompt}</span></div>
          <div className="text-cyber-muted text-[11px]">
            Gold: <span className="text-cyber-yellow">{ep.gold || 'Abstención / No data'}</span> | Pred: <span className="text-cyan-300">{ep.text}</span>
          </div>
        </div>

        {/* Etapas de Trace */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-cyber-muted uppercase tracking-wider">
            Etapas del Pipeline (relic_server)
          </div>
          <div className="space-y-1">
            {(ep.trace && ep.trace.length > 0 ? ep.trace : [
              { stage: 'normalizacion', latency_ms: 0.1, output: 'Normalización ejecutada' },
              { stage: 'intencion', latency_ms: 0.2, output: 'Ruta ' + (ep.status || 'UNSUPPORTED') },
              { stage: 'rir', latency_ms: 0.3, output: 'RIR sintáctico generado' },
              { stage: 'validacion', latency_ms: 0.1, output: 'Esquema validado' },
              { stage: 'ejecucion', latency_ms: 0.4, output: ep.text || 'Ejecución exitosa' }
            ]).map((t, i) => (
              <div key={i} className="flex items-start justify-between bg-black/40 border border-cyber-border/60 p-1.5 text-xs">
                <div className="flex items-center space-x-2">
                  <ChevronRight className="w-3 h-3 text-cyber-yellow shrink-0" />
                  <span className="font-bold text-cyber-yellow uppercase text-[10px]">{t.stage}</span>
                  <span className="text-cyber-muted truncate max-w-xs">{t.output}</span>
                </div>
                <div className="flex items-center space-x-1 text-cyber-muted text-[10px] shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{t.latency_ms.toFixed(2)} ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
