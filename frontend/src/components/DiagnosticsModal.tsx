/**
 * Simple Domain — Modal de Diagnóstico y Telemetría
 * Muestra exclusivamente datos reales de /health y /v1/info bajo demanda.
 */

import React, { useEffect } from 'react';
import { X, RefreshCw, Activity, Cpu, Server, AlertTriangle, Clock } from 'lucide-react';
import { TelemetryState } from '../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryState & { refresh: () => Promise<void> };
}

export const DiagnosticsModal: React.FC<Props> = ({ isOpen, onClose, telemetry }) => {
  const { connectionStatus, health, info, lastUpdated, healthError, infoError, isStale, isLoading, refresh } = telemetry;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-title"
    >
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      
      <div className="relative z-10 w-full max-w-2xl bg-cyber-surface border border-cyber-yellow/50 cut-corner-sm shadow-2xl max-h-[90vh] flex flex-col font-mono text-xs text-cyber-text">
        {/* Cabecera */}
        <div className="p-3 sm:p-4 border-b border-cyber-border flex items-center justify-between bg-cyber-card/90">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-cyber-yellow" />
            <h2 id="diagnostics-title" className="font-tech text-base tracking-wider text-white uppercase font-bold">
              SYSTEM DIAGNOSTICS // LIVE TELEMETRY
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="p-1.5 text-cyber-muted hover:text-cyber-yellow transition-colors disabled:opacity-50"
              title="Actualizar telemetría"
              aria-label="Actualizar telemetría del sistema"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-cyber-yellow' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-cyber-muted hover:text-white transition-colors"
              title="Cerrar ventana (Esc)"
              aria-label="Cerrar ventana de diagnóstico"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Advertencia de datos desactualizados */}
        {isStale && (
          <div className="mx-3 sm:mx-4 mt-3 p-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] flex items-center space-x-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Datos desactualizados: la última consulta de sondeo falló.</span>
          </div>
        )}

        {/* Contenido en cuadrícula */}
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Sección A: Health */}
            <section className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm">
              <div className="flex items-center justify-between border-b border-cyber-border pb-1 mb-2">
                <span className="text-[10px] font-bold text-cyber-yellow uppercase tracking-wider flex items-center gap-1">
                  <Server className="h-3 w-3" /> SECCIÓN A — HEALTH (/health)
                </span>
                <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                  connectionStatus === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>{connectionStatus}</span>
              </div>
              {health ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-cyber-muted">Estado Servicio:</span><span className="text-white font-bold">{health.status}</span></div>
                  <div className="flex justify-between items-center"><span className="text-cyber-muted">Detector Preparado:</span>
                    <span className={`px-1 text-[10px] font-bold ${health.detector_ready ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {health.detector_ready ? 'SÍ (READY)' : 'NO (NOT READY)'}
                    </span>
                  </div>
                  <div className="text-[10px] text-cyber-muted bg-cyber-bg/60 p-1.5 border border-cyber-border/40 mt-1">{health.message}</div>
                  {!health.detector_ready && (
                    <div className="text-[10px] text-amber-400/90 italic mt-1">Aviso: HTTP 200 confirma el servicio, pero el detector aún no está calibrado.</div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-cyber-muted italic">{healthError || 'Sin datos de salud disponibles.'}</div>
              )}
            </section>

            {/* Sección B: System Info */}
            <section className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm">
              <div className="flex items-center justify-between border-b border-cyber-border pb-1 mb-2">
                <span className="text-[10px] font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> SECCIÓN B — SYSTEM INFO (/v1/info)
                </span>
              </div>
              {info ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-cyber-muted">Servicio / Paquete:</span><span className="text-cyber-text">{info.service_version} / v{info.package_version}</span></div>
                  <div className="flex justify-between"><span className="text-cyber-muted">Estado Detector:</span><span className="text-cyber-yellow uppercase font-bold">{info.model_status}</span></div>
                  {info.model_configuration && (
                    <div className="text-[10px] bg-cyber-bg/60 p-1.5 border border-cyber-border/40 space-y-0.5">
                      <div className="flex justify-between"><span>Relacional:</span><span>{info.model_configuration.enable_relational ? 'Activado' : 'Desactivado'}</span></div>
                      <div className="flex justify-between"><span>Umbral Calibrado:</span><span>{info.model_configuration.threshold?.toFixed(4) ?? 'Pendiente'}</span></div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] text-cyber-muted mb-1 font-bold">CAPACIDADES:</div>
                    <div className="flex flex-wrap gap-1">
                      {info.capabilities.map((c) => (
                        <span key={c} className="px-1 py-0.2 bg-cyber-bg text-[9px] text-cyber-cyan border border-cyber-cyan/30">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-cyber-muted italic">{infoError || 'Sin datos del sistema.'}</div>
              )}
            </section>
          </div>

          {/* Sección C: Telemetría de Conexión */}
          <section className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm">
            <div className="text-[10px] font-bold text-cyber-yellow uppercase tracking-wider border-b border-cyber-border pb-1 mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> SECCIÓN C — TELEMETRÍA DE CONEXIÓN
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div><span className="text-cyber-muted block">Última actualización:</span><span>{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Nunca'}</span></div>
              <div><span className="text-cyber-muted block">Endpoints sondeados:</span><span>GET /health · GET /v1/info</span></div>
              <div><span className="text-cyber-muted block">Frecuencia sondeo:</span><span>5000 ms (solo visible)</span></div>
            </div>
          </section>

          {/* Sección D: Diagnóstico de Errores */}
          {(healthError || infoError) && (
            <section className="bg-red-950/20 border border-red-500/50 p-3 cut-corner-sm text-[11px] space-y-1">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> SECCIÓN D — DIAGNÓSTICO DE ERRORES
              </div>
              {healthError && <div className="text-red-300"><span className="font-bold">Health:</span> {healthError}</div>}
              {infoError && <div className="text-red-300"><span className="font-bold">Info:</span> {infoError}</div>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
