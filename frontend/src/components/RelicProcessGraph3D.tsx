/**
 * Simple Domain — Red neuronal 3D del proceso de razonamiento (Three.js)
 * Render bajo demanda; cámara libre (rotar, desplazar, zoom). Menos de 180 líneas.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Send, Zap, Loader2 } from 'lucide-react';
import { modularApi } from '../services/modularApi';
import { buildNeuralScene, type Stage } from './neuralGraphScene';

const PIPELINE_STAGES: Stage[] = [
  { name: 'Interfaz de Usuario', desc: 'Captura la consulta y muestra la respuesta final.', color: 0x00f0ff, r: 0.8 },
  { name: 'Orquestador de Dominio', desc: 'Recibe la consulta, decide la ruta y registra la traza.', color: 0xfcee0a, r: 0.9 },
  { name: 'Motor de Razonamiento', desc: 'Punto de entrada del pipeline formal por capas.', color: 0x9d4edd, r: 0.9 },
  { name: 'L0 · Normalizador', desc: 'Limpia y normaliza el texto de entrada.', color: 0x38bdf8, r: 0.55 },
  { name: 'L1 · Reglas', desc: 'Extrae entidades, relaciones y operaciones.', color: 0x60a5fa, r: 0.55 },
  { name: 'L2 · Compilación RIR', desc: 'Compila la intención a representación intermedia.', color: 0xa855f7, r: 0.55 },
  { name: 'L3 · Cálculo', desc: 'Resuelve de forma simbólica y determinista.', color: 0x00ff9d, r: 0.55 },
  { name: 'L4 · Verificación', desc: 'Valida formalmente; responde o se abstiene.', color: 0xfcee0a, r: 0.55 },
  { name: 'Consolidación', desc: 'El orquestador integra resultado, ruta y latencia.', color: 0xfcee0a, r: 0.8 },
  { name: 'Entrega en Cliente', desc: 'La interfaz presenta el resultado al usuario.', color: 0x00f0ff, r: 0.8 },
];
const MATCH_COLORS = { EXACT_MATCH: 0x00ff9d, CORRECT_ABSTENTION: 0xfcee0a, ERROR: 0xff0055 };


export const RelicProcessGraph3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [matchType, setMatchType] = useState<keyof typeof MATCH_COLORS>('EXACT_MATCH');
  const [query, setQuery] = useState(''), [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState<any>(null), [stageIdx, setStageIdx] = useState(0);
  const stateRef = useRef({ colorHex: MATCH_COLORS.EXACT_MATCH });
  const runRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06090e, 0.02);
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.set(0, 4, 18);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; controls.enablePan = true; controls.enableZoom = true;
    controls.screenSpacePanning = true; controls.minDistance = 3; controls.maxDistance = 80;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const pl = new THREE.PointLight(0x00f0ff, 3, 60); pl.position.set(0, 8, 10); scene.add(pl);

    const n = PIPELINE_STAGES.length;
    const { nodes, curves, halo } = buildNeuralScene(scene, PIPELINE_STAGES);
    const pMat = new THREE.MeshBasicMaterial({ color: MATCH_COLORS.EXACT_MATCH });
    const packet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), pMat);
    const pHalo = halo(MATCH_COLORS.EXACT_MATCH, 2); packet.add(pHalo); scene.add(packet);

    // Render bajo demanda: solo al mover la cámara o mientras corre una traza.
    let frameId = 0, t = 0, running = false, lastTime = 0, last = -1;
    const draw = () => {
      const seg = Math.min(Math.floor(t), n - 2);
      packet.position.copy(curves[seg].getPoint(t - seg));
      pMat.color.setHex(stateRef.current.colorHex); pHalo.material.color.setHex(stateRef.current.colorHex);
      const active = Math.round(t);
      nodes.forEach((m, i) => {
        m.scale.setScalar(i === active ? 1.35 : 1);
        (m.material as THREE.MeshStandardMaterial).emissiveIntensity = i === active ? 1 : 0.3;
      });
      if (active !== last) { last = active; setStageIdx(active); }
      renderer.render(scene, camera);
    };
    const step = (now: number) => {
      t += Math.min((now - lastTime) / 1000, 0.1) * 1.2;
      lastTime = now;
      if (t >= n - 1) { t = n - 1; running = false; }
      draw();
      if (running) frameId = requestAnimationFrame(step);
    };
    runRef.current = () => {
      cancelAnimationFrame(frameId);
      t = 0; running = true; lastTime = performance.now();
      frameId = requestAnimationFrame(step);
    };
    controls.addEventListener('change', draw); draw();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); draw();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frameId); window.removeEventListener('resize', onResize);
      controls.removeEventListener('change', draw); controls.dispose(); renderer.dispose(); el.innerHTML = '';
    };
  }, []);

  const handleRunQuery = async (qText: string) => {
    if (!qText.trim()) return;
    try {
      setLoading(true);
      const res = await modularApi.traceSandboxQuery(qText.trim());
      setTraceData(res);
      const mt: keyof typeof MATCH_COLORS = res.match_type in MATCH_COLORS ? res.match_type : 'EXACT_MATCH';
      setMatchType(mt); stateRef.current.colorHex = MATCH_COLORS[mt];
    } catch {
      setMatchType('ERROR'); stateRef.current.colorHex = MATCH_COLORS.ERROR;
    } finally { setLoading(false); runRef.current(); }
  };

  const stage = PIPELINE_STAGES[stageIdx];
  return (
    <div className="flex-1 flex flex-col h-full bg-cyber-bg font-mono text-cyber-text relative overflow-hidden">
      <div className="absolute top-3 left-3 z-20 pointer-events-none max-w-sm">
        <div className="bg-cyber-card/85 border border-cyber-border p-2.5 cut-corner-sm backdrop-blur-md">
          <div className="flex items-center space-x-1.5 text-cyber-yellow text-xs font-bold">
            <Zap className="w-4 h-4" /><span>PIPELINE DE RAZONAMIENTO 3D</span>
          </div>
          <div className="mt-1.5 text-[10px] space-y-0.5">
            <div className="text-cyan-400 font-bold">ETAPA {stageIdx + 1}/{PIPELINE_STAGES.length}: {stage.name}</div>
            <div className="text-cyber-muted">{stage.desc}</div>
          </div>
          <div className="mt-1.5 text-[9px] text-cyber-muted/80">Arrastra: rotar · Clic derecho: mover · Rueda: zoom</div>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-20 pointer-events-auto flex flex-col items-end space-y-2">
        <div className={`px-3 py-1.5 border text-xs font-bold cut-corner-sm backdrop-blur-md ${
          matchType === 'EXACT_MATCH' ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300' :
          matchType === 'CORRECT_ABSTENTION' ? 'bg-amber-950/70 border-cyber-yellow text-cyber-yellow' : 'bg-red-950/70 border-red-500 text-red-400'
        }`}>ESTADO: {matchType.replace('_', ' ')}</div>
        {traceData && (
          <div className="bg-cyber-card/90 border border-cyber-border p-2 text-[10px] max-w-xs cut-corner-sm text-cyber-muted space-y-0.5">
            <div>Ruta: <span className="text-white font-bold">{traceData.relic?.route}</span></div>
            <div>Latencia: <span className="text-cyan-400">{traceData.relic?.latency_ms} ms</span></div>
            <div>Resultado: <span className="text-emerald-300 font-bold">{traceData.relic?.text}</span></div>
          </div>
        )}
      </div>

      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="p-3 bg-cyber-card/90 border-t border-cyber-border relative z-20">
        <form onSubmit={(e) => { e.preventDefault(); handleRunQuery(query); }} className="max-w-4xl mx-auto flex items-center space-x-2">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ingresa una consulta para trazar el flujo de razonamiento..." className="flex-1 bg-black/60 border border-cyber-border px-3 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden cut-corner-xs" />
          <button type="submit" disabled={loading || !query.trim()} className="flex items-center space-x-1.5 px-4 py-1.5 bg-cyber-yellow text-black font-bold text-xs cut-corner-xs hover:bg-yellow-400 cursor-pointer disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>EJECUTAR TRAZA</span>
          </button>
        </form>
      </div>
    </div>
  );
};
