/**
 * Simple Domain — Sección de Sesiones / Chats dentro del Offcanvas
 * Soporta búsqueda en tiempo real, renombrado en línea, eliminación y estados activos.
 */

import React, { useState } from 'react';
import { Plus, MessageSquare, Clock, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import { Conversation } from '../types/conversations';

interface SidebarSessionsProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  onNew: () => void;
  onDelete?: (convId: string, title: string) => void;
  onRename?: (convId: string, newTitle: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const SidebarSessions: React.FC<SidebarSessionsProps> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  searchQuery = '',
  onSearchChange,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const currentSearch = onSearchChange ? searchQuery : localSearch;
  const handleSearch = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!currentSearch.trim()) return true;
    const q = currentSearch.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages?.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const startEditing = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditingTitle(c.title);
  };

  const saveEditing = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editingTitle.trim();
    if (trimmed && onRename) {
      onRename(id, trimmed);
    }
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col pt-3 border-t border-cyber-border font-mono text-xs">
      {/* Cabecera de sesiones */}
      <div className="flex items-center justify-between px-2 pb-2 text-[10px] text-cyber-muted uppercase tracking-wider shrink-0">
        <span className="flex items-center space-x-1 font-bold text-cyber-yellow">
          <MessageSquare className="w-3 h-3" />
          <span>SESIONES // CHAT</span>
        </span>
        <button
          onClick={onNew}
          className="flex items-center space-x-1 px-1.5 py-0.5 bg-cyber-yellow/10 hover:bg-cyber-yellow hover:text-black border border-cyber-yellow/40 text-cyber-yellow cut-corner-sm transition-all cursor-pointer font-bold"
          title="Nueva sesión de chat"
        >
          <Plus className="w-3 h-3" />
          <span className="text-[9px]">NUEVA</span>
        </button>
      </div>

      {/* Barra de búsqueda de sesiones */}
      <div className="px-2 pb-2 shrink-0">
        <div className="relative flex items-center bg-cyber-card/60 border border-cyber-border/70 px-2 py-1 cut-corner-sm focus-within:border-cyber-yellow/60 transition-colors">
          <Search className="w-3 h-3 text-cyber-muted mr-1.5 shrink-0" />
          <input
            type="text"
            value={currentSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar sesiones..."
            aria-label="Buscar sesiones"
            className="w-full bg-transparent text-[11px] text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none"
          />
          {currentSearch && (
            <button
              onClick={() => handleSearch('')}
              className="text-cyber-muted hover:text-white p-0.5 transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Lista scrolleable de sesiones */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="px-2 py-4 text-[10px] text-cyber-muted/60 text-center">
            {currentSearch ? 'No se encontraron sesiones' : 'Sin sesiones activas'}
          </div>
        ) : (
          filteredConversations.map((c) => {
            const isActive = c.id === activeId;
            const isEditing = editingId === c.id;

            return (
              <div
                key={c.id}
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
                  <form
                    onSubmit={(e) => saveEditing(c.id, e)}
                    className="flex items-center space-x-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 bg-cyber-bg border border-cyber-yellow px-1.5 py-0.5 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                      title="Guardar título"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1 text-rose-400 hover:text-rose-300"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <div
                        className="text-[11px] truncate flex-1"
                        onDoubleClick={(e) => startEditing(c, e)}
                        title="Doble clic para renombrar"
                      >
                        {c.title}
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {onRename && (
                          <button
                            onClick={(e) => startEditing(c, e)}
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
                          {new Date(c.updated_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                      <span>{c.messages?.length || c.message_count || 0} msgs</span>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SidebarSessions;
