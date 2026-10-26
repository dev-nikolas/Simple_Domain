/**
 * Simple Domain — Vista Detallada de Fuente de Datos (/data-sources/:id)
 * Lee dinámicamente el contenido local físico devuelto por el backend.
 * CERO DATOS HARDCODEADOS. Menos de 180 líneas.
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Database, Table, Code2, Copy, Check, Loader2, AlertCircle, Search } from 'lucide-react';
import { modularApi } from '../services/modularApi';

interface DataSourceDetailViewProps {
  sourceId: string;
  onBack: () => void;
}

interface SourceContentPayload {
  id: string;
  name: string;
  format: string;
  location?: string;
  total_rows: number;
  columns: string[];
  rows: Record<string, unknown>[];
  raw_text: string;
  metadata?: Record<string, unknown>;
}

export const DataSourceDetailView: React.FC<DataSourceDetailViewProps> = ({ sourceId, onBack }) => {
  const [data, setData] = useState<SourceContentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'table' | 'raw' | 'meta'>('table');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    modularApi.getDataSourceContent(sourceId)
      .then((res) => { if (active) { setData(res); setLoading(false); } })
      .catch((err) => { if (active) { setError(err?.message || 'Error al cargar dataset.'); setLoading(false); } });
    return () => { active = false; };
  }, [sourceId]);

  const handleCopy = () => {
    if (!data?.raw_text) return;
    navigator.clipboard.writeText(data.raw_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = (data?.rows || []).filter((r) =>
    !search.trim() || Object.values(r).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto font-mono text-cyber-text space-y-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-cyber-border pb-3">
          <div className="flex items-center space-x-3 min-w-0">
            <button onClick={onBack} className="p-1.5 bg-cyber-card border border-cyber-yellow/40 hover:border-cyber-yellow text-cyber-yellow cut-corner-xs cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-cyber-yellow shrink-0" />
                <h1 className="text-sm font-bold text-white uppercase truncate">{data?.name || sourceId}</h1>
                <span className="text-[9px] px-1.5 py-0.5 border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 font-bold uppercase">{data?.format || 'DATASET'}</span>
              </div>
              <p className="text-[10px] text-cyber-muted mt-0.5 truncate">
                Ubicación: <span className="text-cyber-yellow">{data?.location || 'Local canónico'}</span> · Registros: {data?.total_rows || 0}
              </p>
            </div>
          </div>
          <button onClick={handleCopy} className="flex items-center space-x-1 px-3 py-1 bg-cyber-card border border-cyber-border hover:border-cyber-yellow text-cyber-yellow text-[10px] cut-corner-xs cursor-pointer">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡COPIADO!' : 'COPIAR RAW'}</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-500/50 text-red-400 text-xs cut-corner-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex space-x-3 border-b border-cyber-border text-xs font-bold">
          {(['table', 'raw', 'meta'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2 flex items-center space-x-1.5 border-b-2 cursor-pointer ${tab === t ? 'border-cyber-yellow text-cyber-yellow' : 'border-transparent text-cyber-muted hover:text-white'}`}>
              {t === 'table' && <Table className="w-3.5 h-3.5" />}
              {t === 'raw' && <Code2 className="w-3.5 h-3.5" />}
              {t === 'meta' && <Database className="w-3.5 h-3.5" />}
              <span className="uppercase">{t === 'table' ? `Tabla (${filtered.length})` : t === 'raw' ? 'Contenido Crudo' : 'Metadata'}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-cyber-muted space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyber-yellow mx-auto" />
            <p>Leyendo contenido físico del archivo local en backend...</p>
          </div>
        ) : tab === 'table' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-cyber-muted absolute left-2.5 top-2.5" />
                <input type="text" placeholder="Filtrar registros locales..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-8 pr-3 py-1.5 bg-black/50 border border-cyber-border text-xs focus:outline-none focus:border-cyber-yellow" />
              </div>
              <div className="text-[10px] text-cyber-muted flex items-center space-x-2">
                <span>Pág {page} de {totalPages}</span>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-0.5 border border-cyber-border disabled:opacity-30 cursor-pointer">&lt;</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-0.5 border border-cyber-border disabled:opacity-30 cursor-pointer">&gt;</button>
              </div>
            </div>
            <div className="overflow-x-auto border border-cyber-border bg-cyber-card/70 cut-corner-sm max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-cyber-surface border-b border-cyber-border text-[10px] text-cyber-muted uppercase font-bold sticky top-0">
                  <tr>{(data?.columns || []).map((c, i) => (<th key={i} className="p-2.5 whitespace-nowrap text-cyber-yellow">{c}</th>))}</tr>
                </thead>
                <tbody className="divide-y divide-cyber-border/40 font-mono text-[11px]">
                  {pageRows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-cyber-yellow/5">
                      {(data?.columns || []).map((c, cIdx) => {
                        const val = r[c];
                        const text = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
                        return <td key={cIdx} className="p-2.5 whitespace-nowrap max-w-xs truncate" title={text}>{text}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'raw' ? (
          <pre className="p-4 bg-black/90 border border-cyber-border/70 text-emerald-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-96 cut-corner-sm">
            {data?.raw_text || 'Archivo sin contenido textual exportable.'}
          </pre>
        ) : (
          <pre className="p-4 bg-black/90 border border-cyber-border/70 text-cyan-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-96 cut-corner-sm">
            {JSON.stringify(data?.metadata || {}, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
