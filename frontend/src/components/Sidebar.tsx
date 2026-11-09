/**
 * Simple Domain — Offcanvas Drawer de Sesiones (Cyberpunk HUD)
 * Principio de Responsabilidad Única (SRP): Navegación e historial de chats con estilo RELIC.
 */

import React, { useEffect } from 'react';
import { X, Plus, Database } from 'lucide-react';
import { Conversation } from '../types/conversations';
import { SidebarSessions } from './SidebarSessions';
import { RelicLogo } from './RelicLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations?: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (c: Conversation) => void;
  onNewConversation?: () => void;
  onOpenEpisodicMemory?: () => void;
  onDeleteConversation?: (id: string, t: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onNewConversation,
  onOpenEpisodicMemory,
  onDeleteConversation,
  onRenameConversation,
  searchQuery = '',
  onSearchChange,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-[#08080d] border-r border-[#232736] shadow-2xl shadow-red-950/30 transform transition-transform duration-300 font-mono flex flex-col justify-between p-3 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#232736] shrink-0">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="p-1 bg-[#101117] border border-cyber-red/40 rounded flex items-center justify-center">
                <RelicLogo size={20} color="#ff1f3d" />
              </div>
              <span className="font-tech text-base tracking-wider text-white font-black truncate">
                RELIC SESSIONS
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-cyber-red hover:bg-cyber-red/10 rounded transition-colors cursor-pointer"
              title="Cerrar panel"
              aria-label="Cerrar panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 space-y-2 shrink-0">
            <button
              onClick={() => {
                onNewConversation?.();
                onClose();
              }}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-cyber-red hover:bg-cyber-red-bright text-white rounded font-bold transition-all cursor-pointer shadow-sm shadow-cyber-red/30 text-xs font-mono uppercase tracking-wider"
              title="Iniciar nuevo chat"
            >
              <Plus className="h-4 w-4" />
              <span>NUEVO CHAT</span>
            </button>

            {onOpenEpisodicMemory && (
              <button
                onClick={() => {
                  onOpenEpisodicMemory();
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-[#101117] hover:bg-[#1a1b24] border border-[#2b2f42] hover:border-cyber-red text-gray-300 hover:text-white rounded font-bold transition-all cursor-pointer text-xs font-mono uppercase tracking-wider"
                title="Memoria episódica y reglas aprendidas"
              >
                <Database className="h-3.5 w-3.5 text-cyber-red" />
                <span>MEMORIA EPISÓDICA</span>
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <SidebarSessions
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={(c) => {
                onSelectConversation?.(c);
                onClose();
              }}
              onDelete={onDeleteConversation}
              onRename={onRenameConversation}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
            />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
