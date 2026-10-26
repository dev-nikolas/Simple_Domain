/**
 * Simple Domain — Sandbox Lab (Investigación > Sandbox Lab)
 * Incluye Grafo 3D de Arquitectura RELIC desacoplada y modo benchmark con SSE. Menos de 180 líneas.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, RefreshCw, AlertCircle, HelpCircle, Box, BarChart2 } from 'lucide-react';
import { modularApi } from '../../services/modularApi';
import { SandboxRun, SandboxEpisode } from '../../types/sandbox';
import { API_BASE_URL } from '../../config/env';
import { SandboxChart } from './SandboxChart';
import { SandboxEpisodeViewer } from './SandboxEpisodeViewer';
import { RelicProcessGraph3D } from '../../components/RelicProcessGraph3D';

export const SandboxLab: React.FC = () => {
  const [mode, setMode] = useState<'graph3d' | 'benchmark'>('graph3d');
  const [runs, setRuns] = useState<SandboxRun[]>([]), [selectedRun, setSelectedRun] = useState<SandboxRun | null>(null);
  const [loading, setLoading] = useState(false), [reconnecting, setReconnecting] = useState(false);
  const [activeEp, setActiveEp] = useState<SandboxEpisode[]>([]), [showGlossary, setShowGlossary] = useState(false);
  const [chartPts, setChartPts] = useState<{ episode: number; em_rate: number; mean_reward: number }[]>([]);

  const [level, setLevel] = useState('all'), [seed, setSeed] = useState(42), [system, setSystem] = useState('rules');
  const [penaltyLambda, setPenaltyLambda] = useState(5.0), [maxEpisodes, setMaxEpisodes] = useState(30);

  const esRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const batchBufferRef = useRef<{ chart?: any; ep?: any }[]>([]);

  const loadRuns = async () => {
    try {
      const data = await modularApi.getSandboxRuns();
      setRuns(data);
      if (data.length > 0 && !selectedRun) { setSelectedRun(data[0]); setActiveEp(data[0].episodes || []); }
    } catch (err) { console.error('Error corridas:', err); }
  };

  useEffect(() => {
    loadRuns();
    const interval = setInterval(() => {
      if (batchBufferRef.current.length > 0) {
        const batch = [...batchBufferRef.current];
        batchBufferRef.current = [];
        const newPts = batch.filter((b) => b.chart).map((b) => b.chart);
        const newEps = batch.filter((b) => b.ep).map((b) => b.ep);
        if (newPts.length) setChartPts((prev) => [...prev, ...newPts].slice(-300));
        if (newEps.length) setActiveEp((prev) => [...prev, ...newEps].slice(-200));
      }
    }, 100);
    return () => { clearInterval(interval); if (esRef.current) esRef.current.close(); };
  }, []);

  const connectSSE = (runId: string) => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource(`${API_BASE_URL}/v1/sandbox/runs/${runId}/events`);
    esRef.current = es;
    es.onopen = () => setReconnecting(false);
    es.onmessage = (e) => {
      if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
      try {
        const p = JSON.parse(e.data);
        if (p.type === 'EPISODE_COMPLETED') batchBufferRef.current.push({ chart: { episode: p.data.episode, em_rate: p.data.em_rate, mean_reward: p.data.mean_reward } });
        else if (p.type === 'RIR_PROPOSED') batchBufferRef.current.push({ ep: { episode: p.data.episode, prompt: p.data.route || 'Consulta', status: p.data.status, is_em: p.data.status === 'VALID', reward: 0.0, trace: p.data.trace, gold: '', text: p.data.output_text } });
        else if (p.type === 'sandbox.completed' || p.type === 'sandbox.failed') { es.close(); setLoading(false); loadRuns(); }
      } catch { /* err */ }
    };
    es.onerror = () => { setReconnecting(true); es.close(); setTimeout(() => { if (loading) connectSSE(runId); }, 2000); };
  };

  const startRun = async () => {
    try {
      setLoading(true); setActiveEp([]); setChartPts([]);
      const run = await modularApi.createSandboxRun({ level, seed, system, penalty_lambda: penaltyLambda, max_episodes: maxEpisodes });
      setSelectedRun(run); connectSSE(run.id);
    } catch { setLoading(false); }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyber-border pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMode('graph3d')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 cut-corner-xs text-xs font-bold cursor-pointer transition-all ${
              mode === 'graph3d' ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/50' : 'bg-cyber-card border border-cyber-border text-cyber-muted hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" /><span>ARQUITECTURA SANDBOX 3D</span>
          </button>
          <button
            onClick={() => setMode('benchmark')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 cut-corner-xs text-xs font-bold cursor-pointer transition-all ${
              mode === 'benchmark' ? 'bg-cyber-yellow/20 border border-cyber-yellow text-cyber-yellow' : 'bg-cyber-card border border-cyber-border text-cyber-muted hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /><span>BENCHMARK Y CORRIDAS SSE</span>
          </button>
        </div>
        <div className="text-[10px] text-cyber-muted font-mono">
          MODO: <strong className={mode === 'graph3d' ? 'text-cyan-400' : 'text-cyber-yellow'}>{mode === 'graph3d' ? 'TOPOLOGÍA 3D' : 'EVALUACIÓN CURRICULAR'}</strong>
        </div>
      </div>

      {mode === 'graph3d' ? (
        <div className="h-[580px] w-full border border-cyber-border cut-corner-sm overflow-hidden flex flex-col bg-cyber-bg shadow-2xl">
          <RelicProcessGraph3D />
        </div>
      ) : (
        <div className="space-y-4">
          {reconnecting && (
            <div role="alert" className="bg-amber-950 border border-amber-500 text-amber-200 px-3 py-2 flex items-center justify-between cut-corner-sm">
              <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 animate-pulse text-amber-400" /><span>RECONECTANDO SSE ({lastEventIdRef.current || 'inicio'})...</span></div>
            </div>
          )}
          <div className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="text-cyber-muted">Nivel:</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs">
                <option value="all">all</option><option value="l01">L01 Aritmética</option><option value="l02">L02 Inventario</option><option value="l03">L03 Rechazo</option>
              </select>
              <label className="text-cyber-muted">Semilla:</label>
              <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 0)} className="w-14 bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs" />
              <label className="text-cyber-muted">Sistema:</label>
              <select value={system} onChange={(e) => setSystem(e.target.value)} className="bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs">
                <option value="rules">Reglas (Activo)</option><option value="slot_filler" disabled>Slot-Filler (503)</option><option value="model" disabled>RELIC-10M (503)</option>
              </select>
              <label className="text-cyber-muted">λ:</label>
              <input type="number" step="0.5" value={penaltyLambda} onChange={(e) => setPenaltyLambda(parseFloat(e.target.value))} className="w-12 bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs" />
              <label className="text-cyber-muted">Eps:</label>
              <input type="number" value={maxEpisodes} onChange={(e) => setMaxEpisodes(parseInt(e.target.value))} className="w-14 bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowGlossary(!showGlossary)} className="p-1.5 border border-cyber-border hover:bg-cyber-yellow/10 text-cyber-yellow flex items-center gap-1 text-xs"><HelpCircle className="w-4 h-4" /><span>GLOSARIO</span></button>
              <button onClick={loadRuns} className="p-1.5 border border-cyber-border hover:bg-cyber-yellow/10 text-cyber-muted text-xs"><RefreshCw className="w-4 h-4" /></button>
              <button onClick={startRun} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-yellow text-black font-bold hover:bg-cyber-yellow/80 disabled:opacity-50 text-xs">
                <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><span>{loading ? 'EJECUTANDO...' : 'LANZAR RUN'}</span>
              </button>
            </div>
          </div>

          {showGlossary && (
            <div className="bg-cyber-card border border-cyber-yellow/50 p-2.5 cut-corner-sm text-xs space-y-1 text-cyber-text">
              <div className="font-bold text-cyber-yellow flex items-center justify-between"><span>GLOSARIO DE MÉTRICAS</span><button onClick={() => setShowGlossary(false)} className="text-cyber-muted hover:text-white">✕</button></div>
              <div className="text-[11px] text-cyber-muted"><strong className="text-emerald-400">EM:</strong> Exact Match o abstención válida. | <strong className="text-rose-400">FA:</strong> Falsa Aceptación / error formal emitido como válido.</div>
            </div>
          )}

          <SandboxChart points={chartPts.length ? chartPts : (selectedRun?.episodes || []).map((e, i) => ({ episode: i + 1, em_rate: e.is_em ? 1.0 : 0.0, mean_reward: e.reward }))} totalEpisodes={maxEpisodes} />
          <SandboxEpisodeViewer episodes={activeEp.length ? activeEp : (selectedRun?.episodes || [])} />

          <div className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm space-y-2">
            <div className="text-xs font-bold text-cyber-yellow tracking-wider uppercase">Historial de Corridas ({runs.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-cyber-border text-cyber-muted">
                    <th className="p-1.5">ID</th><th className="p-1.5">Sistema</th><th className="p-1.5">Commit</th><th className="p-1.5">Exact Match</th><th className="p-1.5">FA Rate</th><th className="p-1.5">Recompensa</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} onClick={() => { setSelectedRun(r); setActiveEp(r.episodes || []); }} className="border-b border-cyber-border/40 hover:bg-cyber-yellow/5 cursor-pointer">
                      <td className="p-1.5 font-bold text-cyber-text">{r.id}</td>
                      <td className="p-1.5"><span className="px-1 py-0.5 border border-emerald-800 bg-emerald-950 text-emerald-400 rounded text-xs">[{r.system}]</span></td>
                      <td className="p-1.5 font-mono text-cyber-muted">{r.commit?.slice(0, 7)}</td>
                      <td className="p-1.5 text-cyber-green font-bold">{(r.metrics?.exact_match_rate * 100).toFixed(1)}%</td>
                      <td className="p-1.5 text-rose-400 font-bold">{((r.metrics?.false_acceptance_rate || 0) * 100).toFixed(1)}%</td>
                      <td className="p-1.5 text-cyan-300 font-bold">{r.metrics?.mean_reward?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
