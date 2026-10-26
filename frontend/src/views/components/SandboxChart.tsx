/**
 * Simple Domain — Gráfico SVG en Vivo de Aciertos y Recompensa Acumulada
 * Menos de 180 líneas. Solo SVG y Tailwind.
 */

import React from 'react';
import { Activity } from 'lucide-react';

interface Point {
  episode: number;
  em_rate: number;
  mean_reward: number;
}

interface SandboxChartProps {
  points: Point[];
  totalEpisodes: number;
}

export const SandboxChart: React.FC<SandboxChartProps> = ({ points, totalEpisodes }) => {
  const width = 600;
  const height = 140;
  const padX = 40;
  const padY = 20;

  const maxEp = Math.max(totalEpisodes, points.length, 1);
  const getX = (ep: number) => padX + ((ep - 1) / Math.max(maxEp - 1, 1)) * (width - 2 * padX);
  // em_rate ranges from 0 to 1
  const getY = (val: number) => height - padY - Math.max(0, Math.min(1, val)) * (height - 2 * padY);

  const emPoints = points.map((p) => `${getX(p.episode)},${getY(p.em_rate)}`).join(' ');

  const lastPoint = points[points.length - 1];

  return (
    <div className="bg-cyber-card border border-cyber-border p-3 cut-corner-sm space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 text-cyber-yellow font-bold">
          <Activity className="w-4 h-4" />
          <span>CURVA DE EXACT MATCH EN VIVO</span>
        </div>
        <div className="flex space-x-4 text-cyber-muted text-[11px]">
          <span>Episodios: {points.length} / {maxEp}</span>
          <span className="text-cyber-green font-bold">
            EM: {lastPoint ? (lastPoint.em_rate * 100).toFixed(1) : '0.0'}%
          </span>
          <span className="text-cyan-400 font-bold">
            Recompensa: {lastPoint ? lastPoint.mean_reward.toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 stroke-current">
          {/* Grilla de referencia */}
          <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#333" strokeDasharray="3 3" />
          <line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke="#333" strokeDasharray="3 3" />
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#444" />

          {/* Etiquetas Eje Y */}
          <text x={padX - 8} y={padY + 4} fill="#888" fontSize="9" textAnchor="end">100%</text>
          <text x={padX - 8} y={height / 2 + 3} fill="#888" fontSize="9" textAnchor="end">50%</text>
          <text x={padX - 8} y={height - padY + 3} fill="#888" fontSize="9" textAnchor="end">0%</text>

          {/* Curva de Exact Match */}
          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              points={emPoints}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Marcadores de puntos */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={getX(p.episode)}
              cy={getY(p.em_rate)}
              r="2.5"
              fill="#10b981"
              stroke="#0f172a"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
