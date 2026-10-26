/**
 * Simple Domain — Formulario de Registro de Fuentes de Datos
 */

import React, { useState } from 'react';
import { DataSourceCreate, DataSourceFormat } from '../../types/modular';

interface DataSourceFormProps {
  onSubmit: (data: DataSourceCreate) => Promise<void>;
  onCancel: () => void;
}

export const DataSourceForm: React.FC<DataSourceFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<DataSourceCreate>({
    name: '',
    format: 'csv',
    description: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-cyber-card border border-cyber-yellow/40 cut-corner-sm space-y-3 font-mono">
      <h3 className="text-xs font-bold text-cyber-yellow uppercase">Registrar Nueva Fuente de Datos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-cyber-muted">NOMBRE DE LA FUENTE *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            placeholder="Ej. Tráfico IoT Sensores A"
          />
        </div>
        <div>
          <label className="text-[10px] text-cyber-muted">FORMATO *</label>
          <select
            value={formData.format}
            onChange={(e) => setFormData({ ...formData, format: e.target.value as DataSourceFormat })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
          >
            <option value="csv">CSV (Comma-separated)</option>
            <option value="jsonl">JSONL (JSON Lines - Currículo)</option>
            <option value="json">JSON (Structured records)</option>
            <option value="xlsx">XLSX (Excel Workbook)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-cyber-muted">UBICACIÓN / RUTA RELATIVA</label>
          <input
            type="text"
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            placeholder="Ej. datasets/industrial_feed.csv"
          />
        </div>
        <div>
          <label className="text-[10px] text-cyber-muted">DESCRIPCIÓN</label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            placeholder="Ej. Lecturas cada 5s de presión y vibración"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs text-cyber-muted hover:text-white border border-cyber-border"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-3 py-1 text-xs bg-cyber-yellow text-black font-bold hover:bg-yellow-400"
        >
          Registrar Fuente
        </button>
      </div>
    </form>
  );
};
