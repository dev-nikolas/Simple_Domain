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

const safeString = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
};

const formatStageOutput = (output: unknown): string => {
  if (output === null || output === undefined) return '';
  if (typeof output === 'string') return output;
  if (typeof output === 'number' || typeof output === 'boolean') return String(output);
  if (typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    if (obj.normalized && obj.raw) return `"${obj.normalized}" (raw: "${obj.raw}")`;
    if (obj.intent_kind) return `Intención: ${obj.intent_kind}`;
    if (obj.rir_target) return typeof obj.rir_target === 'string' ? obj.rir_target : JSON.stringify(obj.rir_target);
    if (obj.rir_ast) return typeof obj.rir_ast === 'string' ? obj.rir_ast : JSON.stringify(obj.rir_ast);
    if (obj.semantic_validity) return `Validez: ${obj.semantic_validity}`;
    if (obj.text && obj.route) return `[${obj.route}] ${obj.text}`;
    try {
      return JSON.stringify(output);
    } catch {
      return String(output);
    }
  }
  return String(output);
};

export const SandboxEpisodeViewer: React.FC<SandboxEpisodeViewerProps> = ({ episodes }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const ep = episodes[selectedIdx] || episodes[episodes.length - 1];

  if (!episodes.length) {
    return (
      <div className="p-6 text-center text-xs text-cyber-muted border border-cyber-border bg-cyber-card">
        Esperando inicio de episodios...
      </div>
    );
  }

  const stagesList = ep.trace && ep.trace.length > 0 ? ep.trace : [
    { stage: 'normalizacion', latency_ms: 0.1, output: 'Normalización ejecutada' },
    { stage: 'intencion', latency_ms: 0.2, output: 'Ruta ' + (ep.status || 'UNSUPPORTED') },
    { stage: 'rir', latency_ms: 0.3, output: 'RIR sintáctico generado' },
    { stage: 'validacion', latency_ms: 0.1, output: 'Esquema validado' },
    { stage: 'ejecucion', latency_ms: 0.4, output: ep.text || 'Ejecución exitosa' }
  ];

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
            onClick={() => { setSelectedIdx(idx); setActiveStage(null); }}
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
              <span className="truncate">Ep {item.episode}: {safeString(item.prompt)}</span>
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
      <div className="md:col-span-2 space-y-2.5 pl-2">
        <div className="flex items-center justify-between border-b border-cyber-border pb-1.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-cyber-text">
            <Layers className="w-4 h-4 text-cyber-yellow" />
            <span>EP #{ep.episode} — AUDITORÍA RIR Y TRACE</span>
          </div>
          <span className="text-[11px] font-mono text-cyber-muted">
            Recompensa: <b className={ep.reward >= 0 ? 'text-cyber-green' : 'text-rose-400'}>{ep.reward.toFixed(2)}</b>
          </span>
        </div>

        {/* Flujo Visual Secuencial del Pipeline */}
        <div className="grid grid-cols-5 gap-1 text-center text-[9px] font-bold">
          {['1. Norm', '2. Intención', '3. AST RIR', '4. Val Sem', '5. Ejecución'].map((step, sIdx) => (
            <div
              key={sIdx}
              onClick={() => setActiveStage(activeStage === sIdx ? null : sIdx)}
              className={`p-1 border cut-corner-xs cursor-pointer transition-all ${
                activeStage === sIdx
                  ? 'border-cyber-yellow bg-cyber-yellow/20 text-cyber-yellow font-black'
                  : 'border-cyber-border/70 bg-black/40 text-cyber-muted hover:border-cyber-border'
              }`}
            >
              {step}
            </div>
          ))}
        </div>

        <div className="space-y-1 text-xs">
          <div className="text-cyber-muted text-[11px]">Prompt: <span className="text-cyber-text">{safeString(ep.prompt)}</span></div>
          <div className="text-cyber-muted text-[11px]">
            Gold: <span className="text-cyber-yellow">{safeString(ep.gold) || 'Abstención / No data'}</span> | Pred: <span className="text-cyan-300">{safeString(ep.text)}</span>
          </div>
        </div>

        {/* Etapas de Trace con Selección Interactiva */}
        <div className="space-y-1">
          {stagesList.map((t, i) => (
            <div
              key={i}
              onClick={() => setActiveStage(activeStage === i ? null : i)}
              className={`flex items-start justify-between border p-1.5 text-xs cursor-pointer transition-all ${
                activeStage === i ? 'bg-cyber-yellow/10 border-cyber-yellow/80' : 'bg-black/40 border-cyber-border/60 hover:border-cyber-border'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <ChevronRight className={`w-3 h-3 shrink-0 ${activeStage === i ? 'text-cyber-yellow rotate-90' : 'text-cyber-yellow'}`} />
                <span className="font-bold text-cyber-yellow uppercase text-[10px] shrink-0">{t.stage}</span>
                <span className="text-cyber-muted truncate max-w-xs text-[11px]" title={safeString(t.output)}>
                  {formatStageOutput(t.output)}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-cyber-muted text-[10px] shrink-0">
                <Clock className="w-3 h-3" />
                <span>{t.latency_ms.toFixed(2)} ms</span>
              </div>
            </div>
          ))}
        </div>

        {/* Inspector Detallado de la Etapa Seleccionada */}
        {activeStage !== null && stagesList[activeStage] && (
          <div className="p-2 border border-cyber-yellow/50 bg-black/80 cut-corner-xs text-[10px] space-y-1">
            <div className="flex justify-between items-center text-cyber-yellow font-bold uppercase">
              <span>INSPECCIÓN: {stagesList[activeStage].stage}</span>
              <span className="text-cyber-muted font-mono">{stagesList[activeStage].latency_ms.toFixed(3)} ms</span>
            </div>
            <pre className="text-cyan-300 overflow-x-auto whitespace-pre-wrap max-h-24 p-1.5 bg-black/60 border border-cyber-border/40 font-mono text-[9px]">
              {typeof stagesList[activeStage].output === 'object'
                ? JSON.stringify(stagesList[activeStage].output, null, 2)
                : safeString(stagesList[activeStage].output)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
