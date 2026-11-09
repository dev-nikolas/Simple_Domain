/**
 * Simple Domain — Pantalla de Bienvenida RELIC (Cyberpunk HUD Minimalista)
 * Principio de Responsabilidad Única (SRP): Presentación limpia del estado inicial.
 * Inspirado en Gemini: Isotipo central y bienvenida sin botones de sugerencias preliminares.
 */

import React from 'react';
import { RelicLogo } from '../components/RelicLogo';

export const QuickActionTiles: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-xl mx-auto select-none font-sans">
      {/* Emblema RELIC con resplandor ambiental carmesí */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="absolute w-24 h-24 bg-cyber-red/20 rounded-full blur-2xl animate-pulse" />
        <RelicLogo
          variant="full"
          size={76}
          color="#ff1f3d"
          className="relative z-10 drop-shadow-[0_0_16px_rgba(255,31,61,0.6)]"
        />
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-2">
        ¿Por dónde empezamos?
      </h1>
      <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed font-mono">
        Agente local autónomo para análisis de seguridad, diagnóstico y auditoría sin telemetría externa.
      </p>
    </div>
  );
};

export default QuickActionTiles;
