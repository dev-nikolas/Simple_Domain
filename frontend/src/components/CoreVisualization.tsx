/**
 * Simple Domain — Visualización Central
 * Representación gráfica accesible de la topología de atributos del Benchmark S1.
 */

import React, { useState } from 'react';
import { APP_NAME, APP_SUBTITLE } from '../config/env';

interface NodeItem {
  id: string;
  name: string;
  type: 'CAT' | 'NUM';
  x: number;
  y: number;
}

const ATTRIBUTE_NODES: NodeItem[] = [
  { id: 'mode', name: 'operating_mode', type: 'CAT', x: 190, y: 110 },
  { id: 'zone', name: 'location_zone', type: 'CAT', x: 140, y: 230 },
  { id: 'temp', name: 'temperature', type: 'NUM', x: 330, y: 80 },
  { id: 'power', name: 'power_consumption', type: 'NUM', x: 410, y: 200 },
  { id: 'vib', name: 'vibration', type: 'NUM', x: 310, y: 310 },
  { id: 'press', name: 'pressure', type: 'NUM', x: 180, y: 330 },
];

const RELATIONAL_EDGES: [string, string][] = [
  ['mode', 'temp'],
  ['mode', 'power'],
  ['mode', 'vib'],
  ['vib', 'power'],
  ['zone', 'press'],
  ['temp', 'power'],
  ['mode', 'zone'],
];

export const CoreVisualization: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const activeNode = ATTRIBUTE_NODES.find((n) => n.id === selectedNode);

  const toggleNode = (id: string) => {
    setSelectedNode((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-3 sm:p-4 relative select-none overflow-hidden">
      <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

      {/* Encabezado central responsive */}
      <div className="text-center relative z-10 mb-2 sm:mb-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-cyber-card/90 border border-cyber-yellow/40 cut-corner-sm mb-1.5">
          <span className="w-1.5 h-1.5 bg-cyber-yellow rounded-full animate-ping" />
          <span className="text-[10px] font-mono tracking-widest text-cyber-yellow font-bold uppercase">
            {APP_SUBTITLE}
          </span>
        </div>
        <h1 className="font-tech text-3xl sm:text-5xl md:text-6xl font-black tracking-wider text-white uppercase drop-shadow-md">
          {APP_NAME}
        </h1>
        <p className="text-[11px] sm:text-xs font-mono text-cyber-muted max-w-md mx-auto mt-0.5">
          Topología de canales relacionales · Benchmark S1
        </p>
      </div>

      {/* Panel del grafo relacional */}
      <div className="relative z-10 w-full max-w-xl bg-cyber-card/60 border border-cyber-border p-3 sm:p-4 cut-corner-sm shadow-xl flex flex-col items-center">
        <div className="w-full flex justify-between items-center text-[10px] font-mono text-cyber-muted border-b border-cyber-border pb-1.5 mb-2">
          <span className="text-cyber-yellow font-bold">RELATIONAL TOPOLOGY GRAPH</span>
          <span className="truncate max-w-[200px]">{activeNode ? `CANAL: ${activeNode.name.toUpperCase()}` : 'SELECCIONA UN NODO'}</span>
        </div>

        <svg viewBox="0 0 540 400" className="w-full max-h-[260px] sm:max-h-[320px]">
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcee0a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Aristas relacionales */}
          {RELATIONAL_EDGES.map(([src, dst], idx) => {
            const n1 = ATTRIBUTE_NODES.find((n) => n.id === src);
            const n2 = ATTRIBUTE_NODES.find((n) => n.id === dst);
            if (!n1 || !n2) return null;
            const isHighlighted = selectedNode === src || selectedNode === dst;
            return (
              <line
                key={`edge-${idx}`}
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke={isHighlighted ? '#fcee0a' : 'url(#edgeGrad)'}
                strokeWidth={isHighlighted ? 2.5 : 1.2}
                strokeDasharray={isHighlighted ? 'none' : '4 3'}
                className="transition-all duration-200"
              />
            );
          })}

          {/* Nodos interactivos y accesibles con teclado */}
          {ATTRIBUTE_NODES.map((node) => {
            const isSelected = selectedNode === node.id;
            return (
              <g
                key={node.id}
                tabIndex={0}
                role="button"
                aria-label={`Canal de atributo: ${node.name}`}
                aria-pressed={isSelected}
                className="cursor-pointer focus:outline-none"
                onClick={() => toggleNode(node.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleNode(node.id)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 18 : 13}
                  className={`transition-all duration-200 ${
                    isSelected
                      ? 'fill-cyber-yellow/30 stroke-cyber-yellow stroke-[2.5]'
                      : 'fill-cyber-surface stroke-cyber-cyan/70 stroke-[1.5] hover:stroke-cyber-yellow'
                  }`}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={4}
                  className={isSelected ? 'fill-cyber-yellow animate-ping' : 'fill-cyber-cyan'}
                />
                <text
                  x={node.x}
                  y={node.y + 26}
                  textAnchor="middle"
                  className="fill-cyber-text text-[10px] font-mono select-none"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="w-full mt-2 pt-2 border-t border-cyber-border text-[10px] font-mono flex justify-between text-cyber-muted">
          <span>6 ATRIBUTOS S1: 2 CAT · 4 NUM</span>
          <span className="text-cyber-cyan">7 PARES BIVARIADOS</span>
        </div>
      </div>
    </div>
  );
};
