/**
 * Simple Domain — Sección de Sesiones / Chats dentro del Offcanvas
 */

import React from 'react';
import { Plus, MessageSquare, Clock, Trash2 } from 'lucide-react';
import { Conversation } from '../types/conversations';

interface SidebarSessionsProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  onNew: () => void;
  onDelete?: (convId: string, title: string) => void;
}

export const SidebarSessions: React.FC<SidebarSessionsProps> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col pt-3 border-t border-cyber-border font-mono text-xs">
      <div className="flex items-center justify-between px-2 pb-2 text-[10px] text-cyber-muted uppercase tracking-wider">
        <span className="flex items-center space-x-1 font-bold text-cyber-yellow">
          <MessageSquare className="w-3 h-3" />
          <span>SESIONES // CHAT</span>
        </span>
        <button
          onClick={onNew}
          className="flex items-center space-x-1 px-1.5 py-0.5 bg-cyber-yellow/10 hover:bg-cyber-yellow hover:text-black border border-cyber-yellow/40 text-cyber-yellow cut-corner-sm transition-all"
          title="Nueva sesión de chat"
        >
          <Plus className="w-3 h-3" />
          <span className="text-[9px] font-bold">NUEVA</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="px-2 py-3 text-[10px] text-cyber-muted/60 text-center">
            Sin sesiones activas
          </div>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(c); }}
                className={`w-full text-left p-2 transition-all cut-corner-sm border cursor-pointer group relative ${
                  isActive
                    ? 'bg-cyber-yellow/15 border-cyber-yellow/70 text-white shadow-cyber-yellow-sm font-bold'
                    : 'bg-cyber-card/40 border-cyber-border/60 text-cyber-muted hover:text-white hover:border-cyber-border hover:bg-cyber-card'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="text-[11px] truncate flex-1">{c.title}</div>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.id, c.title);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-cyber-muted hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all shrink-0 cursor-pointer"
                      title="Eliminar sesión"
                      aria-label={`Eliminar sesión ${c.title}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[9px] text-cyber-muted/70 mt-1">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                  <span>{c.messages?.length || 0} msgs</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
