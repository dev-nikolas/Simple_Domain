/**
 * Simple Domain — Sandbox Lab (Investigación > Sandbox Lab)
 * Menos de 180 líneas. EventSource con Last-Event-ID, accesibilidad teclado/aria y vista móvil.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';
import { modularApi } from '../../services/modularApi';
import { SandboxRun, SandboxEpisode } from '../../types/sandbox';
import { API_BASE_URL } from '../../config/env';
import { SandboxChart } from './SandboxChart';
import { SandboxEpisodeViewer } from './SandboxEpisodeViewer';

export const SandboxLab: React.FC = () => {
  const [runs, setRuns] = useState<SandboxRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<SandboxRun | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [reconnecting, setReconnecting] = useState<boolean>(false);
  const [activeEp, setActiveEp] = useState<SandboxEpisode[]>([]);
  const [chartPts, setChartPts] = useState<{ episode: number; em_rate: number; mean_reward: number }[]>([]);
  const [showGlossary, setShowGlossary] = useState<boolean>(false);

  // Form controls
  const [level, setLevel] = useState<string>('all');
  const [seed, setSeed] = useState<number>(42);
  const [system, setSystem] = useState<string>('rules');
  const [penaltyLambda, setPenaltyLambda] = useState<number>(5.0);
  const [maxEpisodes, setMaxEpisodes] = useState<number>(30);

  const esRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const batchBufferRef = useRef<{ chart?: any; ep?: any }[]>([]);

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

  // Buffer de renders de 100 ms para evitar re-renders por cada micro-evento
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
    return () => {
      clearInterval(interval);
      if (esRef.current) esRef.current.close();
    };
  }, []);

  const connectSSE = (runId: string) => {
    if (esRef.current) esRef.current.close();
    const url = `${API_BASE_URL}/v1/sandbox/runs/${runId}/events`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setReconnecting(false);
    es.onmessage = (event) => {
      if (event.lastEventId) lastEventIdRef.current = event.lastEventId;
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'EPISODE_COMPLETED') {
          batchBufferRef.current.push({ chart: { episode: payload.data.episode, em_rate: payload.data.em_rate, mean_reward: payload.data.mean_reward } });
        } else if (payload.type === 'RIR_PROPOSED') {
          batchBufferRef.current.push({ ep: { episode: payload.data.episode, prompt: payload.data.route || 'Consulta', status: payload.data.status, is_em: payload.data.status === 'VALID', reward: 0.0, trace: payload.data.trace, gold: '', text: payload.data.output_text } });
        } else if (payload.type === 'sandbox.completed' || payload.type === 'sandbox.failed') {
          es.close();
          setLoading(false);
          loadRuns();
        }
      } catch { /* parse error */ }
    };
    es.onerror = () => {
      setReconnecting(true);
      es.close();
      setTimeout(() => { if (loading) connectSSE(runId); }, 2000);
    };
  };

  const startRun = async () => {
    try {
      setLoading(true);
      setActiveEp([]);
      setChartPts([]);
      const run = await modularApi.createSandboxRun({ level, seed, system, penalty_lambda: penaltyLambda, max_episodes: maxEpisodes });
      setSelectedRun(run);
      connectSSE(run.id);
    } catch (err) {
      console.error('Error al iniciar corrida:', err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Banner de Reconexión SSE */}
      {reconnecting && (
        <div role="alert" className="bg-amber-950 border border-amber-500 text-amber-200 px-3 py-2 flex items-center justify-between cut-corner-sm">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 animate-pulse text-amber-400" /><span>RECONECTANDO CON SERVIDOR (Last-Event-ID: {lastEventIdRef.current || 'inicio'})...</span></div>
        </div>
      )}

      {/* Región ARIA Live para lectores de pantalla */}
      <div aria-live="polite" className="sr-only">Progreso actual: {chartPts.length} de {maxEpisodes} episodios procesados.</div>

      {/* Barra de Lanzamiento de Corrida */}
      <div className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="text-cyber-muted">Nivel:</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs">
            <option value="all">all (Todos)</option><option value="l01">L01 Aritmética Directa</option><option value="l02">L02 Unidades e Inventario</option><option value="l03">L03 Rechazo Epistémico</option>
          </select>
          <label className="text-cyber-muted">Semilla:</label>
          <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 0)} className="w-16 bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs" />
          <label className="text-cyber-muted">Sistema:</label>
          <select value={system} onChange={(e) => setSystem(e.target.value)} className="bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs">
            <option value="rules">Reglas Simbólicas (Activo)</option>
            <option value="slot_filler" disabled>Slot-Filler (Deshabilitado: 503 sin pesos)</option>
            <option value="model" disabled>Modelo RELIC-10M (Deshabilitado: 503 sin pesos)</option>
          </select>
          <label className="text-cyber-muted">λ:</label>
          <input type="number" step="0.5" value={penaltyLambda} onChange={(e) => setPenaltyLambda(parseFloat(e.target.value))} className="w-14 bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs" />
          <label className="text-cyber-muted">Eps:</label>
          <input type="number" value={maxEpisodes} onChange={(e) => setMaxEpisodes(parseInt(e.target.value))} className="w-16 bg-black/60 border border-cyber-border p-1 text-cyber-text text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGlossary(!showGlossary)} className="p-1.5 border border-cyber-border hover:bg-cyber-yellow/10 text-cyber-yellow flex items-center gap-1 text-xs" title="Glosario"><HelpCircle className="w-4 h-4" /><span>GLOSARIO</span></button>
          <button onClick={loadRuns} className="p-1.5 border border-cyber-border hover:bg-cyber-yellow/10 text-cyber-muted text-xs" title="Recargar"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={startRun} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-yellow text-black font-bold hover:bg-cyber-yellow/80 disabled:opacity-50 text-xs">
            <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><span>{loading ? 'EJECUTANDO...' : 'LANZAR RUN'}</span>
          </button>
        </div>
      </div>

      {/* Glosario de Métricas y Notación */}
      {showGlossary && (
        <div className="bg-cyber-card border border-cyber-yellow/50 p-3 cut-corner-sm text-xs space-y-1.5 text-cyber-text">
          <div className="font-bold text-cyber-yellow flex items-center justify-between"><span>GLOSARIO DE MÉTRICAS Y CONCEPTOS FORMALES</span><button onClick={() => setShowGlossary(false)} className="text-cyber-muted hover:text-white">✕</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-cyber-muted pt-1">
            <div><strong className="text-emerald-400">EM (Exact Match):</strong> Salida semánticamente idéntica al gold o abstención deliberada correcta ante preguntas no soportadas.</div>
            <div><strong className="text-rose-400">FA (Falsa Aceptación):</strong> Respuesta incorrecta emitida con estatus VALID ante casos resolubles o epistémicos.</div>
            <div><strong className="text-cyan-300">Wilson 95%:</strong> Intervalo de confianza asimétrico para proporciones binomiales (pequeñas muestras).</div>
            <div><strong className="text-amber-400">λ (Factor Asimétrico):</strong> Penalización severa por falso positivo frente a recompensa moderada por abstención.</div>
            <div className="md:col-span-2"><strong className="text-purple-400">RIR (Relational Intermediate Rep.):</strong> Árbol sintáctico ejecutable y validado semánticamente antes de resolver.</div>
          </div>
        </div>
      )}

      {/* Gráfico en Vivo y Visor */}
      <SandboxChart points={chartPts.length ? chartPts : (selectedRun?.episodes || []).map((e, i) => ({ episode: i + 1, em_rate: e.is_em ? 1.0 : 0.0, mean_reward: e.reward }))} totalEpisodes={maxEpisodes} />
      <SandboxEpisodeViewer episodes={activeEp.length ? activeEp : (selectedRun?.episodes || [])} />

      {/* Tabla Comparativa Accesible (Desktop) y Tarjetas (Mobile) */}
      <div className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm space-y-2">
        <div className="text-xs font-bold text-cyber-yellow tracking-wider uppercase">Tabla Comparativa de Corridas ({runs.length})</div>
        {/* Vista Móvil (Tarjetas) */}
        <div className="block md:hidden space-y-2">
          {runs.map((r) => (
            <div key={r.id} tabIndex={0} role="button" aria-label={`Seleccionar corrida ${r.id}`} onClick={() => { setSelectedRun(r); setActiveEp(r.episodes || []); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedRun(r); setActiveEp(r.episodes || []); } }} className="border border-cyber-border p-2 bg-black/40 hover:border-cyber-yellow text-xs space-y-1 cursor-pointer">
              <div className="flex justify-between font-bold text-cyber-text"><span>{r.id}</span><span className="text-cyber-green">[✓ {(r.metrics?.exact_match_rate * 100).toFixed(1)}% EM]</span></div>
              <div className="flex justify-between text-cyber-muted"><span>Sistema: [{r.system}]</span><span>FA: [✗ {((r.metrics?.false_acceptance_rate || 0) * 100).toFixed(1)}%]</span></div>
              <div className="text-cyber-muted text-xs">Recompensa Media: {r.metrics?.mean_reward?.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Vista Desktop (Tabla Accesible por Teclado) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cyber-border text-cyber-muted">
                <th className="p-2">ID</th><th className="p-2">Sistema</th><th className="p-2">Commit</th><th className="p-2">Dataset Hash</th><th className="p-2">Exact Match [✓]</th><th className="p-2">FA Rate [✗]</th><th className="p-2">Recompensa</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} tabIndex={0} role="button" aria-label={`Seleccionar corrida ${r.id}`} onClick={() => { setSelectedRun(r); setActiveEp(r.episodes || []); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedRun(r); setActiveEp(r.episodes || []); } }} className="border-b border-cyber-border/40 hover:bg-cyber-yellow/5 focus:bg-cyber-yellow/10 focus:outline-none cursor-pointer">
                  <td className="p-2 font-bold text-cyber-text">{r.id}</td>
                  <td className="p-2"><span className="px-1.5 py-0.5 border border-emerald-800 bg-emerald-950 text-emerald-400 rounded text-xs">[{r.system}]</span></td>
                  <td className="p-2 font-mono text-cyber-muted">{r.commit?.slice(0, 7)}</td>
                  <td className="p-2 font-mono text-cyber-muted">{r.dataset_hash?.slice(0, 8)}...</td>
                  <td className="p-2 text-cyber-green font-bold">{(r.metrics?.exact_match_rate * 100).toFixed(1)}% <span className="text-xs text-cyber-muted">[{((r.metrics?.wilson_95?.[0] || 0) * 100).toFixed(1)}%, {((r.metrics?.wilson_95?.[1] || 1) * 100).toFixed(1)}%]</span></td>
                  <td className="p-2 text-rose-400 font-bold">{((r.metrics?.false_acceptance_rate || 0) * 100).toFixed(1)}%</td>
                  <td className="p-2 text-cyan-300 font-bold">{r.metrics?.mean_reward?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

