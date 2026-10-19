/**
 * Simple Domain — Formulario de Registro de Experimentos
 */

import React, { useState } from 'react';
import { ExperimentCreate, ExperimentStatus } from '../../types/modular';

interface ExperimentFormProps {
  onSubmit: (data: ExperimentCreate) => Promise<void>;
  onCancel: () => void;
}

export const ExperimentForm: React.FC<ExperimentFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<ExperimentCreate>({
    title: '',
    description: '',
    hypothesis: '',
    status: 'draft',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-cyber-card border border-cyber-yellow/40 cut-corner-sm space-y-3 font-mono">
      <h3 className="text-xs font-bold text-cyber-yellow uppercase">Registrar Nuevo Experimento</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-cyber-muted">TÍTULO *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            placeholder="Ej. Calibración con cuantil 0.98"
          />
        </div>
        <div>
          <label className="text-[10px] text-cyber-muted">ESTADO</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as ExperimentStatus })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
          >
            <option value="draft">draft (Borrador)</option>
            <option value="running">running (En progreso)</option>
            <option value="completed">completed (Completado)</option>
            <option value="archived">archived (Archivado)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-cyber-muted">HIPÓTESIS</label>
        <input
          type="text"
          value={formData.hypothesis || ''}
          onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
          className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
          placeholder="Ej. Reducir falsos positivos mediante pesos relacionales"
        />
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
          Guardar Experimento
        </button>
      </div>
    </form>
  );
};
