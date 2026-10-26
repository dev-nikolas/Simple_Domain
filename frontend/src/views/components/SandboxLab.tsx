/**
 * Simple Domain — Sandbox Lab (Investigación > Sandbox Lab)
 * Menos de 180 líneas. Solo SVG y Tailwind. Reutiliza insignias de procedencia.
 */

import React, { useEffect, useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { modularApi } from '../../services/modularApi';
import { SandboxRun, SandboxEpisode } from '../../types/sandbox';
import { API_BASE_URL } from '../../config/env';
import { SandboxChart } from './SandboxChart';
import { SandboxEpisodeViewer } from './SandboxEpisodeViewer';

export const SandboxLab: React.FC = () => {
  const [runs, setRuns] = useState<SandboxRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<SandboxRun | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeEp, setActiveEp] = useState<SandboxEpisode[]>([]);
  const [chartPts, setChartPts] = useState<{ episode: number; em_rate: number; mean_reward: number }[]>([]);

  // Form controls
  const [level, setLevel] = useState<string>('L1_direct_lookup');
  const [seed, setSeed] = useState<number>(42);
  const [system, setSystem] = useState<string>('rules');
  const [penaltyLambda, setPenaltyLambda] = useState<number>(5.0);
  const [maxEpisodes, setMaxEpisodes] = useState<number>(20);

  const loadRuns = async () => {
    try {
      const data = await modularApi.getSandboxRuns();
      setRuns(data);
      if (data.length > 0 && !selectedRun) {
        setSelectedRun(data[0]);
        setActiveEp(data[0].episodes || []);
      }
    } catch (err) {
      console.error('Error cargando corridas:', err);
    }
  };

  useEffect(() => { loadRuns(); }, []);

  const startRun = async () => {
    try {
      setLoading(true);
      setActiveEp([]);
      setChartPts([]);
      const run = await modularApi.createSandboxRun({
        level, seed, system, penalty_lambda: penaltyLambda, max_episodes: maxEpisodes
      });
      setSelectedRun(run);
      // Suscribirse a SSE
      const es = new EventSource(`${API_BASE_URL}/v1/sandbox/runs/${run.id}/events`);
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'EPISODE_COMPLETED') {
            const epNum = payload.data.episode;
            setChartPts((prev) => [...prev, { episode: epNum, em_rate: payload.data.em_rate, mean_reward: payload.data.mean_reward }]);
          } else if (payload.type === 'RIR_PROPOSED') {
            setActiveEp((prev) => [...prev, {
              episode: payload.data.episode, prompt: payload.data.route || 'Consulta',
              status: payload.data.status, is_em: payload.data.status === 'VALID',
              reward: 0.0, trace: payload.data.trace, gold: '', text: payload.data.output_text
            }]);
          } else if (payload.type === 'sandbox.completed') {
            es.close();
            setLoading(false);
            loadRuns();
          }
        } catch { /* parse error */ }
      };
      es.onerror = () => { es.close(); setLoading(false); };
    } catch (err) {
      console.error('Error al iniciar corrida:', err);
      setLoading(false);
    }
  };

  const badgeClass = (sys: string) => {
    if (sys === 'rules') return 'bg-emerald-950 text-emerald-400 border-emerald-800';
    if (sys === 'slot_filler') return 'bg-amber-950 text-amber-400 border-amber-800';
    return 'bg-purple-950 text-purple-400 border-purple-800';
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Barra de Lanzamiento de Corrida */}
      <div className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-cyber-muted text-[11px]">Nivel:</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="bg-black/60 border border-cyber-border p-1 text-cyber-text">
            <option value="L1_direct_lookup">L1 Direct Lookup</option>
            <option value="L2_simple_calc">L2 Simple Calc</option>
            <option value="L3_symbolic_filter">L3 Symbolic Filter</option>
            <option value="all">Todos los niveles</option>
          </select>
          <label className="text-cyber-muted text-[11px]">Semilla:</label>
          <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 0)} className="w-14 bg-black/60 border border-cyber-border p-1 text-cyber-text" />
          <label className="text-cyber-muted text-[11px]">Sistema:</label>
          <select value={system} onChange={(e) => setSystem(e.target.value)} className="bg-black/60 border border-cyber-border p-1 text-cyber-text">
            <option value="rules">Reglas Simbólicas</option>
            <option value="slot_filler">Slot-Filler</option>
            <option value="model">Modelo RELIC-10M</option>
          </select>
          <label className="text-cyber-muted text-[11px]">λ:</label>
          <input type="number" step="0.5" value={penaltyLambda} onChange={(e) => setPenaltyLambda(parseFloat(e.target.value))} className="w-14 bg-black/60 border border-cyber-border p-1 text-cyber-text" />
          <label className="text-cyber-muted text-[11px]">Eps:</label>
          <input type="number" value={maxEpisodes} onChange={(e) => setMaxEpisodes(parseInt(e.target.value))} className="w-14 bg-black/60 border border-cyber-border p-1 text-cyber-text" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRuns} className="p-1.5 border border-cyber-border hover:bg-cyber-yellow/10 text-cyber-muted" title="Recargar"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={startRun} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-yellow text-black font-bold hover:bg-cyber-yellow/80 disabled:opacity-50">
            <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'EJECUTANDO...' : 'LANZAR RUN'}</span>
          </button>
        </div>
      </div>

      {/* Gráfico en Vivo */}
      <SandboxChart points={chartPts.length ? chartPts : (selectedRun?.episodes || []).map((e, i) => ({ episode: i + 1, em_rate: e.is_em ? 1.0 : 0.0, mean_reward: e.reward }))} totalEpisodes={maxEpisodes} />

      {/* Visor de Episodio y Árbol RIR */}
      <SandboxEpisodeViewer episodes={activeEp.length ? activeEp : (selectedRun?.episodes || [])} />

      {/* Tabla Comparativa de Corridas */}
      <div className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm space-y-2">
        <div className="text-[11px] font-bold text-cyber-yellow tracking-wider uppercase">Tabla Comparativa de Corridas ({runs.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-cyber-border text-cyber-muted">
                <th className="p-1.5">ID</th><th className="p-1.5">Sistema</th><th className="p-1.5">Commit</th><th className="p-1.5">Dataset Hash</th><th className="p-1.5">Exact Match (Wilson 95%)</th><th className="p-1.5">FA Rate</th><th className="p-1.5">Recompensa</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} onClick={() => { setSelectedRun(r); setActiveEp(r.episodes || []); }} className="border-b border-cyber-border/40 hover:bg-cyber-yellow/5 cursor-pointer">
                  <td className="p-1.5 font-bold text-cyber-text">{r.id}</td>
                  <td className="p-1.5"><span className={`px-1.5 py-0.5 border rounded text-[10px] uppercase ${badgeClass(r.system)}`}>[{r.system}]</span></td>
                  <td className="p-1.5 font-mono text-cyber-muted">{r.commit?.slice(0, 7)}</td>
                  <td className="p-1.5 font-mono text-cyber-muted">{r.dataset_hash?.slice(0, 8)}...</td>
                  <td className="p-1.5 text-cyber-green font-bold">{(r.metrics?.exact_match_rate * 100).toFixed(1)}% <span className="text-[9px] text-cyber-muted">[{((r.metrics?.wilson_95?.[0] || 0) * 100).toFixed(1)}%, {((r.metrics?.wilson_95?.[1] || 1) * 100).toFixed(1)}%]</span></td>
                  <td className="p-1.5 text-rose-400">{((r.metrics?.false_acceptance_rate || 0) * 100).toFixed(1)}%</td>
                  <td className="p-1.5 text-cyan-300 font-bold">{r.metrics?.mean_reward?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
