/**
 * Simple Domain — Visor de Influencia Conversacional y Divergencia con Sandbox
 * Menos de 180 líneas. Permite auditar cómo las consultas del Chat se despachan en RELIC
 * sin contaminar la evaluación formal del Sandbox Curricular.
 */

import React, { useEffect, useState } from 'react';
import { MessageSquare, RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import { modularApi } from '../../services/modularApi';
import { Conversation } from '../../types/conversations';

export const ChatInfluenceViewer: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await modularApi.getConversations();
      setConversations(data);
      if (data.length > 0 && !selectedConv) {
        setSelectedConv(data[0]);
      } else if (selectedConv) {
        const updated = data.find((c) => c.id === selectedConv.id);
        setSelectedConv(updated || (data.length > 0 ? data[0] : null));
      }
    } catch (err) {
      console.error('Error al cargar conversaciones en investigación:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleDelete = async (convId: string, title: string) => {
    if (!window.confirm(`¿Eliminar la sesión "${title}"?`)) return;
    try {
      await modularApi.deleteConversation(convId);
      const updated = conversations.filter((c) => c.id !== convId);
      setConversations(updated);
      if (selectedConv?.id === convId) {
        setSelectedConv(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error('Error eliminando sesión:', err);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Banner de Delimitación de Dominios */}
      <div className="p-3 border border-cyber-yellow/40 bg-cyber-card cut-corner-sm flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyber-yellow shrink-0 mt-0.5" />
        <div className="space-y-1 text-cyber-muted text-[11px]">
          <span className="font-bold text-cyber-yellow block text-xs">
            AISLAMIENTO METODOLÓGICO: CHAT INTERACTIVO VS SANDBOX CURRICULAR
          </span>
          <p>
            Las consultas libres del chat son interactivas y contextuales (ej. deducciones relacionales o preguntas espontáneas). El <strong>Sandbox Lab</strong> opera estrictamente sobre el dataset de referencia (split holdout de 4.500 casos) con semillas reproducibles para evitar sesgos cognitivos y contaminación contextual.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-cyber-border pb-2">
        <div className="flex items-center space-x-2 text-cyber-text font-bold">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>SESIONES REGISTRADAS PARA ANÁLISIS ({conversations.length})</span>
        </div>
        <button
          onClick={loadConversations}
          className="p-1.5 border border-cyber-border hover:bg-cyber-yellow/10 text-cyber-muted hover:text-cyber-yellow cut-corner-xs"
          title="Recargar sesiones"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="p-8 text-center border border-cyber-border/50 bg-cyber-card/30 cut-corner-sm text-cyber-muted">
          No hay sesiones de chat registradas todavía. Inicia una conversación en Home para ver su telemetría.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lista de Sesiones */}
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedConv(c)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedConv(c); }}
                className={`p-2.5 border cut-corner-xs cursor-pointer flex items-center justify-between transition-all ${
                  selectedConv?.id === c.id
                    ? 'border-cyber-yellow bg-cyber-yellow/15 text-white'
                    : 'border-cyber-border bg-black/40 text-cyber-muted hover:border-cyber-border/80'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[11px] truncate">{c.title}</div>
                  <div className="text-[9px] text-cyber-muted mt-0.5">{c.messages?.length || 0} mensajes</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(c.id, c.title);
                  }}
                  className="p-1 text-cyber-muted hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all ml-2"
                  title="Eliminar sesión"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Detalle de Consultas y Despacho en RELIC */}
          <div className="md:col-span-2 border border-cyber-border bg-cyber-card p-3 cut-corner-sm space-y-3 max-h-96 overflow-y-auto">
            {selectedConv ? (
              <div className="space-y-3">
                <div className="border-b border-cyber-border pb-2 flex justify-between items-center">
                  <span className="font-bold text-cyber-yellow text-xs">{selectedConv.title}</span>
                  <span className="text-[10px] text-cyber-muted font-mono">{selectedConv.id}</span>
                </div>
                {selectedConv.messages?.length ? (
                  <div className="space-y-2">
                    {selectedConv.messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 cut-corner-xs border text-xs space-y-1.5 ${
                          m.role === 'user'
                            ? 'bg-cyber-yellow/5 border-cyber-yellow/30 text-cyber-text'
                            : 'bg-black/40 border-cyber-border/70 text-cyber-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase text-[10px] text-cyber-yellow">
                            {m.role === 'user' ? 'OPERADOR / CONSULTA' : 'RESPUESTA RELIC'}
                          </span>
                          {m.metadata?.route ? (
                            <span className="text-[9px] px-1.5 py-0.5 border border-cyan-800 bg-cyan-950 text-cyan-300 font-mono">
                              [{String(m.metadata.route)}]
                            </span>
                          ) : null}
                        </div>
                        <div className="text-white text-[11px] whitespace-pre-wrap">{m.content}</div>
                        {m.metadata && (m.metadata.status || m.metadata.latency_ms !== undefined) ? (
                          <div className="flex items-center gap-3 text-[9px] text-cyber-muted font-mono pt-1 border-t border-cyber-border/40">
                            {m.metadata.status ? (
                              <span className={String(m.metadata.status) === 'VALID' ? 'text-emerald-400' : 'text-amber-400'}>
                                Estatus: {String(m.metadata.status)}
                              </span>
                            ) : null}
                            {m.metadata.latency_ms !== undefined && (
                              <span>Latencia: {Number(m.metadata.latency_ms).toFixed(2)} ms</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-cyber-muted text-xs">Esta sesión no contiene mensajes.</div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-cyber-muted text-xs">Selecciona una sesión para ver su flujo.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
