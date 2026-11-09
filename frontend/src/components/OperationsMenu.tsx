/**
 * Simple Domain — Menú Desplegable de Adjuntar Archivos (+)
 * Acceso directo a ingesta de archivos CSV/JSON para la conversación activa.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Upload, AlertCircle, Loader2 } from 'lucide-react';

interface OperationsMenuProps {
  onFileSelected?: (file: File) => void;
  isProcessing?: boolean;
}

export const OperationsMenu: React.FC<OperationsMenuProps> = ({
  onFileSelected,
  isProcessing = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      setErrorMsg('Formato no admitido. Usa .csv o .json');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('El archivo excede el límite de 4 MB.');
      return;
    }

    setIsOpen(false);
    if (onFileSelected) {
      onFileSelected(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="relative font-mono text-xs select-none" ref={menuRef}>
      <input
        id="chat-file-upload-input"
        ref={fileInputRef}
        type="file"
        accept=".csv, .json, text/csv, application/json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        disabled={isProcessing}
        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#101117] border border-[#232736] hover:border-cyber-red hover:bg-cyber-red/15 text-cyber-red rounded-lg transition-all focus:outline-none"
        title="Adjuntar archivo CSV o JSON al chat"
        aria-label="Adjuntar archivo CSV o JSON al chat"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-cyber-red" />
        ) : (
          <Plus className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-45 text-white' : 'text-cyber-red'}`} />
        )}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-0 mb-2 w-72 bg-[#0a0a0f] border border-cyber-red/60 rounded-xl p-2.5 space-y-2 z-50 backdrop-blur-md shadow-2xl shadow-red-950/40"
        >
          <div className="flex items-center justify-between border-b border-[#232736] pb-1.5 text-[10px] text-gray-400">
            <span className="font-bold text-cyber-red tracking-wider uppercase">ADJUNTAR ARCHIVO</span>
            <span>CSV / JSON</span>
          </div>

          {errorMsg && (
            <div className="flex items-center space-x-1.5 p-2 bg-red-950/60 border border-cyber-red/50 text-red-300 text-[10px] rounded">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{errorMsg}</span>
            </div>
          )}

          <label
            htmlFor="chat-file-upload-input"
            className="w-full flex items-center space-x-2.5 p-2.5 bg-[#101117] hover:bg-cyber-red/10 border border-[#232736] hover:border-cyber-red text-left transition-colors group cursor-pointer rounded-lg"
          >
            <div className="p-1.5 bg-[#0a0a0f] border border-[#232736] group-hover:border-cyber-red text-cyber-red rounded shrink-0">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-white group-hover:text-cyber-red truncate">
                {isProcessing ? 'PROCESANDO ARCHIVO...' : 'SELECCIONAR ARCHIVO'}
              </div>
              <div className="text-[9px] text-gray-500 truncate">
                Datos estructurados (máx. 4 MB)
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
};

export default OperationsMenu;
