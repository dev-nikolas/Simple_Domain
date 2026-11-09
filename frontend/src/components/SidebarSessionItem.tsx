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
      className={`w-full text-left p-2 transition-all cut-corner-sm border cursor-pointer group relative ${
        isActive
          ? 'bg-cyber-yellow/15 border-cyber-yellow/70 text-white shadow-cyber-yellow-sm font-bold'
          : 'bg-cyber-card/40 border-cyber-border/60 text-cyber-muted hover:text-white hover:border-cyber-border hover:bg-cyber-card'
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
            className="flex-1 bg-cyber-bg border border-cyber-yellow px-1.5 py-0.5 text-xs text-white focus:outline-none"
          />
          <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300" title="Guardar título">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={cancelEditing} className="p-1 text-rose-400 hover:text-rose-300" title="Cancelar">
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
                  className="p-1 text-cyber-muted hover:text-cyber-yellow rounded transition-all shrink-0 cursor-pointer"
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
                  className="p-1 text-cyber-muted hover:text-rose-400 rounded transition-all shrink-0 cursor-pointer"
                  title="Eliminar sesión"
                  aria-label={`Eliminar sesión ${c.title}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-cyber-muted/70 mt-1">
            <span className="flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5" />
              <span>
                {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </span>
            <span>{c.messages?.length || c.message_count || 0} msgs</span>
          </div>
        </>
      )}
    </div>
  );
};

export default SidebarSessionItem;

