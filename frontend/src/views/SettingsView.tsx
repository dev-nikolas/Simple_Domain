/**
 * Simple Domain — Vista de Configuración (Settings)
 * Consulta y actualización de preferencias persistentes del sistema.
 */

import React, { useEffect, useState } from 'react';
import { Settings, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { modularApi } from '../services/modularApi';
import { SystemPreferences } from '../types/modular';
import { SettingsForm } from './components/SettingsForm';

export const SettingsView: React.FC = () => {
  const [prefs, setPrefs] = useState<SystemPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await modularApi.getSettings();
      setPrefs(res.preferences);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefs) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      const res = await modularApi.updateSettings(prefs);
      setPrefs(res.preferences);
      setSuccessMsg('Preferencias guardadas exitosamente.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Restablecer todas las preferencias a sus valores predeterminados?')) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      const res = await modularApi.resetSettings();
      setPrefs(res.preferences);
      setSuccessMsg('Preferencias restablecidas a valores de fábrica.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al restablecer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto font-mono text-cyber-text">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-cyber-border pb-4">
          <div>
            <div className="flex items-center space-x-2 text-cyber-yellow text-sm font-bold tracking-wider">
              <Settings className="w-5 h-5" />
              <span>CONFIGURACIÓN DEL SISTEMA</span>
            </div>
            <p className="text-xs text-cyber-muted mt-1">
              Preferencias locales persistentes del entorno y calibración de inferencia.
            </p>
          </div>
          <button
            onClick={loadSettings}
            className="p-2 border border-cyber-border bg-cyber-card hover:bg-cyber-yellow/10 text-cyber-muted hover:text-cyber-yellow cut-corner-sm"
            title="Recargar configuración"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-500/50 text-red-400 text-xs cut-corner-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center space-x-2 p-3 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 text-xs cut-corner-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {loading || !prefs ? (
          <div className="text-center py-12 text-cyber-muted text-xs">Cargando preferencias...</div>
        ) : (
          <SettingsForm
            prefs={prefs}
            onChange={setPrefs}
            onSubmit={handleSave}
            onReset={handleReset}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
};
