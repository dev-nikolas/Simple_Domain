/**
 * Simple Domain — Elemento de Regla en la Memoria Episódica
 * Principio de Responsabilidad Única (SRP): Presentación de una regla o lección aprendida.
 */

import React from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { EpisodicMemoryRule } from '../types/relic';

interface EpisodicRuleItemProps {
  rule: EpisodicMemoryRule;
  onDelete: (id: string) => void;
}

export const EpisodicRuleItem: React.FC<EpisodicRuleItemProps> = ({ rule, onDelete }) => {
  return (
    <div className="p-3 bg-[#0d0e14] border border-[#232736] hover:border-cyber-red/50 rounded-lg space-y-1.5 transition-all group select-none">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyber-red" />
          <span className="font-bold text-cyber-red uppercase">{rule.topic}</span>
        </div>
        <button
          onClick={() => onDelete(rule.id)}
          className="text-gray-500 hover:text-cyber-red opacity-60 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
          title="Eliminar de memoria"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-gray-300 leading-relaxed font-sans">{rule.conclusion}</p>

      <div className="text-[9px] text-gray-500 pt-1 flex items-center justify-between border-t border-white/5">
        <span>ID: {rule.id}</span>
        <span>{new Date(rule.timestamp).toLocaleString('es-ES')}</span>
      </div>
    </div>
  );
};

export default EpisodicRuleItem;
