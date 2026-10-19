/**
 * Simple Domain — Formulario de Preferencias del Sistema
 */

import React from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { SystemPreferences } from '../../types/modular';

interface SettingsFormProps {
  prefs: SystemPreferences;
  onChange: (updated: SystemPreferences) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  saving: boolean;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  prefs,
  onChange,
  onSubmit,
  onReset,
  saving,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4 font-mono">
      <div className="p-4 bg-cyber-card border border-cyber-border cut-corner-sm space-y-4">
        <h3 className="text-xs font-bold text-cyber-yellow uppercase">Parámetros Operativos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-cyber-muted">NOMBRE DEL SISTEMA</label>
            <input
              type="text"
              value={prefs.system_name}
              onChange={(e) => onChange({ ...prefs, system_name: e.target.value })}
              className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            />
          </div>
          <div>
            <label className="text-[10px] text-cyber-muted">CUANTIL (0.50 - 0.999)</label>
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="0.999"
              value={prefs.default_quantile}
              onChange={(e) => onChange({ ...prefs, default_quantile: parseFloat(e.target.value) || 0.95 })}
              className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            />
          </div>
          <div>
            <label className="text-[10px] text-cyber-muted">POLL TELEMETRÍA (MS)</label>
            <input
              type="number"
              step="500"
              min="1000"
              max="60000"
              value={prefs.telemetry_poll_interval_ms}
              onChange={(e) => onChange({ ...prefs, telemetry_poll_interval_ms: parseInt(e.target.value) || 5000 })}
              className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            />
          </div>
          <div>
            <label className="text-[10px] text-cyber-muted">CONTRASTE VISUAL</label>
            <select
              value={prefs.theme_contrast}
              onChange={(e) => onChange({ ...prefs, theme_contrast: e.target.value as 'normal' | 'high' })}
              className="w-full bg-cyber-bg border border-cyber-border px-2.5 py-1.5 text-xs text-white focus:border-cyber-yellow outline-hidden"
            >
              <option value="high">High (Cyberpunk contrast)</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-cyber-border/40 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex items-center space-x-2 text-xs text-white cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enable_relational_default}
              onChange={(e) => onChange({ ...prefs, enable_relational_default: e.target.checked })}
              className="accent-cyber-yellow"
            />
            <span>Habilitar relacional</span>
          </label>
          <label className="flex items-center space-x-2 text-xs text-white cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.auto_refresh_ui}
              onChange={(e) => onChange({ ...prefs, auto_refresh_ui: e.target.checked })}
              className="accent-cyber-yellow"
            />
            <span>Auto-refresco UI</span>
          </label>
          <label className="flex items-center space-x-2 text-xs text-white cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.audit_strict_mode}
              onChange={(e) => onChange({ ...prefs, audit_strict_mode: e.target.checked })}
              className="accent-cyber-yellow"
            />
            <span>Auditoría estricta</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="flex items-center space-x-1.5 px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-950/30 text-xs cut-corner-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restablecer Fábrica</span>
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-1.5 px-4 py-2 bg-cyber-yellow text-black font-bold text-xs cut-corner-sm hover:bg-yellow-400"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Guardando...' : 'Guardar Preferencias'}</span>
        </button>
      </div>
    </form>
  );
};
