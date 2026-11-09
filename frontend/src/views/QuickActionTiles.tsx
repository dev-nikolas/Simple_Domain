/**
 * Simple Domain — Tarjetas de Inicio Rápido (Cyberpunk HUD Hero)
 * Principio de Responsabilidad Única (SRP): Presentación del estado vacío con atajos.
 */

import React from 'react';
import { Cpu, Code2, Shield, Database, Sparkles } from 'lucide-react';

interface QuickActionTilesProps {
  onSendMessage: (text: string) => void;
}

export const QuickActionTiles: React.FC<QuickActionTilesProps> = ({ onSendMessage }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center max-w-2xl mx-auto select-none">
      <div className="w-16 h-16 bg-[#0f111b] border border-cyber-yellow/60 flex items-center justify-center rounded-2xl mb-4 shadow-xl shadow-cyber-yellow/15 relative">
        <div className="absolute inset-0 bg-cyber-yellow/10 rounded-2xl animate-ping opacity-25" />
        <Cpu className="w-8 h-8 text-cyber-yellow animate-pulse" />
      </div>

      <div className="space-y-1 mb-6">
        <span className="px-2 py-0.5 bg-cyber-yellow text-black font-tech font-bold uppercase tracking-widest text-[11px] rounded cut-corner-xs shadow-sm shadow-cyber-yellow/30">
          RELIC COGNITIVE ENGINE // C-NATIVE
        </span>
        <h1 className="font-tech text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mt-2">
          STYLE OVER SUBSTANCE
        </h1>
        <p className="text-xs text-cyber-muted max-w-md mx-auto leading-relaxed">
          Agente autónomo local para ingeniería inversa, verificación en sandbox y razonamiento determinista sin telemetría externa.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        <button
          onClick={() =>
            onSendMessage(
              'Analiza este payload malicioso y explica la rutina de desofuscación XOR paso a paso con su función de decodificación en C'
            )
          }
          className="p-3 bg-[#0d0e17]/90 border border-cyber-border/70 hover:border-cyber-yellow text-left rounded-lg transition-all cursor-pointer hover:bg-[#131522] group shadow-md"
        >
          <div className="flex items-center space-x-2 text-cyber-yellow font-bold text-xs uppercase font-tech">
            <Code2 className="w-4 h-4 text-cyber-yellow group-hover:rotate-12 transition-transform" />
            <span>&gt; Desofuscar Payload XOR</span>
          </div>
          <p className="text-[11px] text-cyber-muted mt-1 font-sans">
            Extracción de llaves, entropía de datos y rutina reversa en C.
          </p>
        </button>

        <button
          onClick={() =>
            onSendMessage(
              'Ejecuta una auditoría de bajo nivel en C: detecta fugas de memoria, optimizaciones zero-alloc y valida la rutina en el sandbox'
            )
          }
          className="p-3 bg-[#0d0e17]/90 border border-cyber-border/70 hover:border-cyan-400 text-left rounded-lg transition-all cursor-pointer hover:bg-[#131522] group shadow-md"
        >
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase font-tech">
            <Shield className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>&gt; Auditoría & Verificación Sandbox</span>
          </div>
          <p className="text-[11px] text-cyber-muted mt-1 font-sans">
            Validación ejecutiva con `relic_agent_verify_code_block`.
          </p>
        </button>

        <button
          onClick={() =>
            onSendMessage(
              'Consulta la base de conocimiento BM25 de RELIC y explica cómo funciona la memoria episódica en episodic_log.relic'
            )
          }
          className="p-3 bg-[#0d0e17]/90 border border-cyber-border/70 hover:border-purple-400 text-left rounded-lg transition-all cursor-pointer hover:bg-[#131522] group shadow-md"
        >
          <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs uppercase font-tech">
            <Database className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
            <span>&gt; Memoria Episódica & RAG BM25</span>
          </div>
          <p className="text-[11px] text-cyber-muted mt-1 font-sans">
            Inspección de tuplas aprendidas: problema, error y solución verificada.
          </p>
        </button>

        <button
          onClick={() =>
            onSendMessage(
              'Busca vulnerabilidades y patrones de ataque en binarios usando las herramientas MCP de RELIC'
            )
          }
          className="p-3 bg-[#0d0e17]/90 border border-cyber-border/70 hover:border-cyber-yellow text-left rounded-lg transition-all cursor-pointer hover:bg-[#131522] group shadow-md"
        >
          <div className="flex items-center space-x-2 text-cyber-yellow font-bold text-xs uppercase font-tech">
            <Sparkles className="w-4 h-4 text-cyber-yellow group-hover:scale-110 transition-transform" />
            <span>&gt; Búsqueda de Vulnerabilidades</span>
          </div>
          <p className="text-[11px] text-cyber-muted mt-1 font-sans">
            Invoca herramientas locales y microkernel de verificación en Rust.
          </p>
        </button>
      </div>

      <div className="mt-8 text-[10px] text-cyber-muted/60 tracking-widest uppercase border-t border-white/5 pt-3">
        PRIVATE RELIC PROTOCOL // ALL OPERATIONS COMPUTED LOCALLY ON HARDWARE
      </div>
    </div>
  );
};

export default QuickActionTiles;

