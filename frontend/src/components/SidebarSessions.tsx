/**
 * Simple Domain — Sección de Sesiones / Chats dentro del Offcanvas
 * Principio de Responsabilidad Única y Composición.
 */

import React, { useState } from 'react';
import { Plus, MessageSquare, Search, X } from 'lucide-react';
import { Conversation } from '../types/conversations';
import { SidebarSessionItem } from './SidebarSessionItem';

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
  const currentSearch = onSearchChange ? searchQuery : localSearch;

  const handleSearch = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    else setLocalSearch(val);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!currentSearch.trim()) return true;
    const q = currentSearch.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.messages?.some((m) => m.content.toLowerCase().includes(q));
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col pt-3 border-t border-cyber-border font-mono text-xs">
      {/* Cabecera */}
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

      {/* Búsqueda */}
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
            <button onClick={() => handleSearch('')} className="text-cyber-muted hover:text-white p-0.5 transition-colors" title="Limpiar búsqueda">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="px-2 py-4 text-[10px] text-cyber-muted/60 text-center">
            {currentSearch ? 'No se encontraron sesiones' : 'Sin sesiones activas'}
          </div>
        ) : (
          filteredConversations.map((c) => (
            <SidebarSessionItem
              key={c.id}
              conversation={c}
              isActive={c.id === activeId}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SidebarSessions;
