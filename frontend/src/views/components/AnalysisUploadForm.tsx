/**
 * Simple Domain — Formulario de Carga y Selección de Archivos para Brain
 */

import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertTriangle, ArrowRight } from 'lucide-react';

interface AnalysisUploadFormProps {
  onAnalyze: (file: File) => Promise<void>;
  loading: boolean;
}

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

export const AnalysisUploadForm: React.FC<AnalysisUploadFormProps> = ({ onAnalyze, loading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      setValidationError('Formato no admitido. Selecciona un archivo .csv o .json.');
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`El archivo excede el límite de 4 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || loading) return;
    await onAnalyze(selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-cyber-card border border-cyber-border cut-corner-sm space-y-4 font-mono">
      <div className="flex items-center justify-between border-b border-cyber-border pb-2">
        <span className="text-xs font-bold text-cyber-yellow tracking-wider uppercase">Ingesta de Datos (CSV / JSON)</span>
        <span className="text-[10px] text-cyber-muted">Límite: 4 MB · UTF-8 / Latin-1</span>
      </div>

      {validationError && (
        <div className="flex items-center space-x-2 p-2.5 bg-red-950/40 border border-red-500/40 text-red-400 text-xs cut-corner-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-cyber-border/80 hover:border-cyber-yellow/60 hover:bg-cyber-yellow/5 p-8 text-center cursor-pointer transition-colors cut-corner-sm"
        >
          <UploadCloud className="w-8 h-8 text-cyber-yellow/70 mx-auto mb-2 animate-bounce" />
          <p className="text-xs text-white font-bold">Haz clic o arrastra un archivo CSV o JSON aquí</p>
          <p className="text-[10px] text-cyber-muted mt-1">Soporta tablas tabulares, pares de series o secuencias numéricas</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .json, text/csv, application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-cyber-bg border border-cyber-yellow/40 cut-corner-sm">
          <div className="flex items-center space-x-3 overflow-hidden">
            <FileText className="w-6 h-6 text-cyber-yellow shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-white font-bold truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-cyber-muted">
                {(selectedFile.size / 1024).toFixed(1)} KB · Formato: {selectedFile.name.split('.').pop()?.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="p-1.5 text-cyber-muted hover:text-red-400"
            title="Quitar archivo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={!selectedFile || loading}
          className={`flex items-center space-x-2 px-5 py-2 text-xs font-bold font-mono cut-corner-sm transition-all ${
            selectedFile && !loading
              ? 'bg-cyber-yellow text-black hover:bg-yellow-400 cursor-pointer shadow-cyber-yellow-sm'
              : 'bg-cyber-card text-cyber-muted/50 border border-cyber-border cursor-not-allowed opacity-60'
          }`}
        >
          <span>{loading ? 'ANALIZANDO EN BRAIN...' : 'ANALIZAR CON BRAIN'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
