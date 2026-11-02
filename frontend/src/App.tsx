/**
 * Simple Domain — App (Espacio Conversacional Esencial)
 * Interfaz enfocada únicamente en los chats y el método de enviar mensajes.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useRouter } from './hooks/useRouter';
import { HomeView } from './views/HomeView';
import { Conversation } from './types/conversations';
import { modularApi } from './services/modularApi';

export const App: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const { currentRoute, conversationId, navigate } = useRouter();

  const loadConversations = useCallback(async () => {
    try {
      const list = await modularApi.getConversations();
      setConversations(list);
      if (conversationId) {
        const found = list.find((c) => c.id === conversationId);
        if (found) setActiveConversation(found);
        else modularApi.getConversation(conversationId).then(setActiveConversation).catch(() => {});
      } else if (list.length > 0 && !activeConversation && currentRoute === '/') {
        setActiveConversation(list[0]);
        navigate(`/c/${list[0].id}`, true);
      }
    } catch { /* fallback */ }
  }, [conversationId, activeConversation, currentRoute, navigate]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (conversationId && activeConversation?.id !== conversationId) {
      const found = conversations.find((c) => c.id === conversationId);
      if (found) setActiveConversation(found);
      else modularApi.getConversation(conversationId).then(setActiveConversation).catch(() => {});
    }
  }, [conversationId, conversations, activeConversation?.id]);

  const handleRefreshActive = useCallback(async () => {
    try {
      const list = await modularApi.getConversations();
      setConversations(list);
      const targetId = activeConversation?.id || conversationId;
      if (targetId) {
        const refreshed = await modularApi.getConversation(targetId);
        setActiveConversation(refreshed);
      } else if (list.length > 0) setActiveConversation(list[0]);
    } catch { /* fallback */ }
  }, [activeConversation, conversationId]);

  const handleNewConversation = async () => {
    try {
      const created = await modularApi.createConversation();
      setConversations((prev) => [created, ...prev]);
      setActiveConversation(created);
      navigate(`/c/${created.id}`);
      setIsMobileSidebarOpen(false);
    } catch { /* fallback */ }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    navigate(`/c/${conv.id}`);
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteConversation = async (convId: string, title: string) => {
    if (!window.confirm(`¿Eliminar la sesión "${title}"?`)) return;
    try {
      await modularApi.deleteConversation(convId);
      setConversations((prev) => {
        const rem = prev.filter((c) => c.id !== convId);
        if (activeConversation?.id === convId) {
          if (rem.length > 0) {
            setActiveConversation(rem[0]);
            navigate(`/c/${rem[0].id}`);
          } else {
            setActiveConversation(null);
            navigate('/');
          }
        }
        return rem;
      });
    } catch (err) {
      alert(`Error al eliminar: ${err instanceof Error ? err.message : 'Error'}`);
    }
  };

  return (
    <div className="h-screen w-full bg-cyber-bg text-cyber-text flex overflow-hidden font-mono">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        conversations={conversations}
        activeConversationId={activeConversation?.id || conversationId || null}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onNewConversation={handleNewConversation}
        />
        <HomeView
          activeConversation={activeConversation}
          onRefreshActive={handleRefreshActive}
          onNewSession={handleNewConversation}
        />
      </div>
    </div>
  );
};

export default App;
