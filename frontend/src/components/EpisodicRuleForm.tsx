/**
 * Simple Domain — Formulario para Registrar Regla en Memoria Episódica
 * Principio de Responsabilidad Única (SRP): Entrada de datos y consolidación.
 */

import React, { useState } from 'react';

interface EpisodicRuleFormProps {
  isLoading: boolean;
  onSubmit: (topic: string, conclusion: string) => Promise<void>;
}

export const EpisodicRuleForm: React.FC<EpisodicRuleFormProps> = ({
  isLoading,
  onSubmit,
}) => {
  const [topic, setTopic] = useState('');
  const [conclusion, setConclusion] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !conclusion.trim()) return;
    await onSubmit(topic.trim(), conclusion.trim());
    setTopic('');
    setConclusion('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-cyber-border bg-black/60 space-y-3 font-mono">
      <div>
        <label className="text-[10px] text-cyber-muted uppercase block mb-1">
          Tópico / Dominio:
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="ej. desofuscacion_xor o parser_c"
          className="w-full bg-[#12131d] border border-cyber-border focus:border-cyber-yellow px-2.5 py-1.5 text-xs text-white rounded outline-none"
          required
        />
      </div>
      <div>
        <label className="text-[10px] text-cyber-muted uppercase block mb-1">
          Conclusión / Regla Verificada:
        </label>
        <textarea
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          placeholder="Describa la regla o lección aprendida..."
          rows={2}
          className="w-full bg-[#12131d] border border-cyber-border focus:border-cyber-yellow px-2.5 py-1.5 text-xs text-white rounded outline-none"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-1.5 bg-cyber-yellow text-black font-bold uppercase tracking-wider text-xs rounded hover:bg-cyber-yellow/90 transition-colors cursor-pointer"
      >
        Consolidar en Memoria Episódica
      </button>
    </form>
  );
};

export default EpisodicRuleForm;

