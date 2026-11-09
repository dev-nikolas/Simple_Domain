/**
 * Simple Domain — Elemento de Sesión en la Barra Lateral
 * Principio de Responsabilidad Única (SRP): Renderizado y renombrado en línea de una sesión.
 */

import React, { useState } from 'react';
import { Clock, Trash2, Edit2, Check, X } from 'lucide-react';
import { Conversation } from '../types/conversations';

interface SidebarSessionItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (c: Conversation) => void;
  onDelete?: (id: string, title: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export const SidebarSessionItem: React.FC<SidebarSessionItemProps> = ({
  conversation: c,
  isActive,
  onSelect,
  onDelete,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(c.title);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingTitle(c.title);
  };

  const saveEditing = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editingTitle.trim();
    if (trimmed && onRename) onRename(c.id, trimmed);
    setIsEditing(false);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  return (
    <div
      onClick={() => !isEditing && onSelect(c)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === 'Enter' || e.key === ' ')) onSelect(c);
      }}
      className={`w-full text-left p-2 transition-all rounded border cursor-pointer group relative ${
        isActive
          ? 'bg-red-950/40 border-cyber-red/80 text-white font-bold'
          : 'bg-[#101117]/60 border-[#232736]/70 text-gray-400 hover:text-white hover:border-[#35394f] hover:bg-[#141620]'
      }`}
    >
      {isEditing ? (
        <form onSubmit={saveEditing} className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Escape' && setIsEditing(false)}
            className="flex-1 bg-[#050508] border border-cyber-red px-1.5 py-0.5 text-xs text-white focus:outline-none rounded"
          />
          <button type="submit" className="p-1 text-cyber-red hover:text-white" title="Guardar título">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={cancelEditing} className="p-1 text-gray-400 hover:text-white" title="Cancelar">
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <>
          <div className="flex items-center justify-between gap-1">
            <div className="text-[11px] truncate flex-1" onDoubleClick={startEditing} title="Doble clic para renombrar">
              {c.title}
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              {onRename && (
                <button
                  onClick={startEditing}
                  className="p-1 text-gray-400 hover:text-cyber-red rounded transition-all shrink-0 cursor-pointer"
                  title="Renombrar sesión"
                  aria-label={`Renombrar sesión ${c.title}`}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id, c.title);
                  }}
                  className="p-1 text-gray-400 hover:text-cyber-red rounded transition-all shrink-0 cursor-pointer"
                  title="Eliminar sesión"
                  aria-label={`Eliminar sesión ${c.title}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-1 text-[9px] text-gray-500 font-mono">
            <span className="flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5" />
              <span>{new Date(c.updated_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
            {c.message_count !== undefined && (
              <span>{c.message_count} msg</span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SidebarSessionItem;
