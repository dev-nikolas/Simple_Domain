/**
 * Simple Domain — Formulario de Registro de Patrones
 */

import React, { useState } from 'react';
import { DataSource, PatternCreate, PatternType } from '../../types/modular';

interface PatternFormProps {
  sources: DataSource[];
  onSubmit: (data: PatternCreate) => Promise<void>;
  onCancel: () => void;
}

export const PatternForm: React.FC<PatternFormProps> = ({ sources, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<PatternCreate>({
    name: '',
    description: '',
    pattern_type: 'relational_bivariate',
    source_id: '',
    status: 'registered',
    origin: 'manual',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const payload: PatternCreate = {
      ...formData,
      source_id: formData.source_id ? formData.source_id : undefined,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-cyber-card border border-cyber-yellow/40 cut-corner-sm space-y-3 font-mono">
      <h3 className="text-xs font-bold text-cyber-yellow uppercase">Registrar Nuevo Patrón</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-cyber-muted">NOMBRE DEL PATRÓN *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            placeholder="Ej. Incompatibilidad Modo/Zona"
          />
        </div>
        <div>
          <label className="text-[10px] text-cyber-muted">TIPO DE PATRÓN *</label>
          <select
            value={formData.pattern_type}
            onChange={(e) => setFormData({ ...formData, pattern_type: e.target.value as PatternType })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
          >
            <option value="relational_bivariate">relational_bivariate (Bivariado)</option>
            <option value="univariate_frequency">univariate_frequency (Frecuencia)</option>
            <option value="cluster">cluster (Agrupamiento)</option>
            <option value="sequence">sequence (Secuencia)</option>
            <option value="custom">custom (Personalizado)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-cyber-muted">FUENTE DE DATOS ASOCIADA (OPCIONAL)</label>
          <select
            value={formData.source_id || ''}
            onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
          >
            <option value="">Ninguna / No vinculada</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.format})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-cyber-muted">ORIGEN DEL REGISTRO</label>
          <select
            value={formData.origin}
            onChange={(e) => setFormData({ ...formData, origin: e.target.value as 'manual' | 'engine' })}
            className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
          >
            <option value="manual">manual (Anotado manualmente)</option>
            <option value="engine">engine (Descubierto por motor)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-cyber-muted">DESCRIPCIÓN</label>
        <input
          type="text"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
          placeholder="Ej. Co-ocurrencia no observada durante calibración"
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
          Guardar Patrón
        </button>
      </div>
    </form>
  );
};
