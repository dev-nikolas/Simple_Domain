/**
 * Simple Domain — Burbuja de Mensaje del Chat con Estado SSE y Resultados
 */

import React, { useEffect, useState } from 'react';
import { User, Cpu, CheckCircle2, Loader2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { ChatMessage } from '../types/conversations';
import { API_BASE_URL } from '../config/env';
import { AnalysisResultCard } from '../views/components/AnalysisResultCard';
import { modularApi } from '../services/modularApi';
import { AnalysisRecord } from '../types/modular';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onJobCompleted?: () => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, onJobCompleted }) => {
  const isUser = message.role === 'user';
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [detailedRecord, setDetailedRecord] = useState<AnalysisRecord | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Suscripción SSE si hay un archive_id y no se ha completado
  useEffect(() => {
    if (!message.archive_id) return;
    let es: EventSource | null = null;

    const checkAndSubscribe = async () => {
      try {
        const manifest = await modularApi.getArchive(message.archive_id!);
        setJobStatus(manifest.status);

        if (manifest.status !== 'completed' && manifest.status !== 'failed') {
          es = new EventSource(`${API_BASE_URL}/v1/archive/${message.archive_id}/events`);
          es.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              const stage = (data.type || '').replace('archive.', '');
              setJobStatus(stage);
              if (stage === 'completed') {
                es?.close();
                onJobCompleted?.();
              }
            } catch {
              // Parse error
            }
          };
          es.onerror = () => {
            es?.close();
          };
        }
      } catch {
        // Error manifest
      }
    };

    checkAndSubscribe();
    return () => {
      es?.close();
    };
  }, [message.archive_id, onJobCompleted]);

  const loadDetails = async () => {
    if (detailedRecord) {
      setShowDetails((prev) => !prev);
      return;
    }
    if (!message.archive_id) return;
    try {
      const manifest = await modularApi.getArchive(message.archive_id);
      const result = await modularApi.getArchiveResult(message.archive_id);
      setDetailedRecord({
        id: manifest.archive_id,
        filename: manifest.filename,
        format: manifest.format as any,
        status: manifest.status as any,
        created_at: manifest.created_at,
        summary: manifest.summary || {},
        result,
        warnings: manifest.warnings || [],
      });
      setShowDetails(true);
    } catch {
      // Error details
    }
  };

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback si no hay permisos de portapapeles
    }
  };

  const route = typeof message.metadata?.route === 'string' ? message.metadata.route : undefined;
  const statusVal = typeof message.metadata?.status === 'string' ? message.metadata.status : undefined;
  const latencyMs = typeof message.metadata?.latency_ms === 'number' ? message.metadata.latency_ms : undefined;
  const rssMb = typeof message.metadata?.rss_mb === 'number' ? message.metadata.rss_mb : undefined;

  return (
    <div className={`flex items-start space-x-3 font-mono text-xs ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded bg-cyber-card border border-cyber-yellow/40 flex items-center justify-center text-cyber-yellow shrink-0">
          <Cpu className="w-4 h-4" />
        </div>
      )}

      <div className={`max-w-2xl space-y-2 cut-corner-sm p-3.5 border ${
        isUser
          ? 'bg-cyber-yellow/10 border-cyber-yellow/40 text-white shadow-cyber-yellow-sm'
          : 'bg-cyber-surface/90 border-cyber-border text-cyber-text backdrop-blur-md'
      }`}>
        {/* Header con rol, hora y botón de copiado */}
        <div className="flex items-center justify-between text-[10px] text-cyber-muted border-b border-cyber-border/40 pb-1 mb-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold uppercase tracking-wider text-cyber-yellow">
              {isUser ? 'OPERADOR' : 'RELIC // SIMPLE DOMAIN'}
            </span>
            {!isUser && route && (
              <span className={`px-1.5 py-0.5 text-[9px] font-bold cut-corner-sm border ${
                route === 'deterministic_arithmetic' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                route === 'deterministic_graph' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                route === 'deterministic_relational' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' :
                route === 'neural_model' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                route === 'degraded_mode' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                route === 'epistemic_rejection' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                'bg-blue-500/20 text-blue-400 border-blue-500/40'
              }`}>
                {
                  route === 'deterministic_arithmetic' ? 'MOTOR EXACTO (ARITMÉTICA)' :
                  route === 'deterministic_graph' ? 'MOTOR EXACTO (GRAFOS BFS)' :
                  route === 'deterministic_relational' ? 'MOTOR EXACTO (ORDEN RELACIONAL)' :
                  route === 'neural_model' ? 'MODELO NEURONAL (TRANSFORMER 10M)' :
                  route === 'degraded_mode' ? 'MODO DEGRADADO (SIN PESOS)' :
                  route === 'epistemic_rejection' ? 'RECHAZO EPISTÉMICO (INCOMPLETO)' :
                  route.toUpperCase()
                }
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>{new Date(message.created_at).toLocaleTimeString()}</span>
            <button
              onClick={handleCopy}
              className="p-1 hover:text-cyber-yellow text-cyber-muted transition-colors rounded hover:bg-cyber-surface/60 cursor-pointer"
              title={copied ? "¡Copiado al portapapeles!" : "Copiar texto"}
              aria-label="Copiar texto del mensaje"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Contenido del mensaje seleccionable y copiable */}
        <div className="whitespace-pre-line leading-relaxed text-[11px] select-text cursor-text">
          {String(message.content || '')}
        </div>

        {/* Footer técnico de telemetría y honestidad de cómputo */}
        {!isUser && (latencyMs !== undefined || statusVal) && (
          <div className="flex items-center justify-between text-[9px] text-cyber-muted/70 border-t border-cyber-border/30 pt-1 mt-1 font-mono">
            <span>
              ESTADO: <strong className={statusVal === 'VALID' ? 'text-emerald-400' : 'text-amber-400'}>{statusVal || 'N/A'}</strong>
            </span>
            <div className="space-x-3">
              {latencyMs !== undefined && (
                <span>LATENCIA: <strong className="text-cyber-text">{latencyMs.toFixed(1)} ms</strong></span>
              )}
              {rssMb !== undefined && (
                <span>RAM: <strong className="text-cyber-text">{rssMb.toFixed(1)} MB</strong></span>
              )}
            </div>
          </div>
        )}

        {/* Live SSE Status Indicator */}
        {jobStatus && jobStatus !== 'completed' && (
          <div className="flex items-center space-x-2 p-2 bg-cyber-bg border border-cyber-yellow/40 text-cyber-yellow text-[10px] cut-corner-sm animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="font-bold uppercase">ESTADO DE TRABAJO: {jobStatus.toUpperCase()}</span>
          </div>
        )}

        {/* Botón para ver tarjeta de resultados matemáticos si está completado */}
        {message.archive_id && (jobStatus === 'completed' || Boolean(message.metadata?.result_summary)) && (
          <div className="pt-2 border-t border-cyber-border/40">
            <button
              onClick={loadDetails}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-cyber-card hover:bg-cyber-yellow/15 border border-cyber-border hover:border-cyber-yellow text-cyber-yellow text-[10px] cut-corner-sm transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showDetails ? 'OCULTAR EVIDENCIA DETALLADA' : 'INSPECCIONAR EVIDENCIA Y PATRONES'}</span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showDetails && detailedRecord && (
              <div className="mt-3">
                <AnalysisResultCard record={detailedRecord} />
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded bg-cyber-card border border-cyber-border flex items-center justify-center text-cyber-muted shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
