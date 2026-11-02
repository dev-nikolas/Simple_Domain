/**
 * Simple Domain — App (Espacio Conversacional Esencial)
 * Interfaz enfocada en chats con persistencia en Gateway/localStorage,
 * sincronización de URL /c/:id, búsqueda, renombrado y streaming en tiempo real.
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useRouter } from './hooks/useRouter';
import { HomeView } from './views/HomeView';
import { Conversation } from './types/conversations';
import { useChat } from './hooks/useChat';

export const App: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    messages,
    isGenerating,
    searchQuery,
    setSearchQuery,
    sendMessage,
    regenerateLastMessage,
    stopGeneration,
    createNewSession,
    renameSession,
    deleteSession,
  } = useChat();

  const { conversationId, navigate } = useRouter();

  // Sincronizar URL /c/:id con la sesión activa al cargar o navegar directamente
  useEffect(() => {
    if (conversationId && conversationId !== activeSessionId) {
      setActiveSessionId(conversationId);
    }
  }, [conversationId, activeSessionId, setActiveSessionId]);

  // Actualizar la barra de direcciones cuando cambia la sesión activa
  useEffect(() => {
    if (activeSessionId) {
      navigate(`/c/${activeSessionId}`, true);
    } else {
      navigate('/', true);
    }
  }, [activeSessionId, navigate]);

  // Convertimos las sesiones de Gateway/localStorage a la interfaz visual Conversation
  const conversations: Conversation[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    created_at: new Date(s.updatedAt).toISOString(),
    updated_at: new Date(s.updatedAt).toISOString(),
    messages: [],
    archive_ids: [],
    message_count: s.messageCount,
  }));

  const activeConversation: Conversation | null = activeSession
    ? {
        id: activeSession.id,
        title: activeSession.title,
        created_at: new Date(activeSession.updatedAt).toISOString(),
        updated_at: new Date(activeSession.updatedAt).toISOString(),
        messages: activeSession.messages.map((m, idx) => ({
          id: `${activeSession.id}-${idx}`,
          conversation_id: activeSession.id,
          role: (m.role === 'tool' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
          content: m.content,
          created_at: new Date(activeSession.updatedAt).toISOString(),
        })),
        archive_ids: [],
      }
    : null;

  const handleSelectConversation = (conv: Conversation) => {
    setActiveSessionId(conv.id);
    navigate(`/c/${conv.id}`);
    setIsMobileSidebarOpen(false);
  };

  const handleNewConversation = () => {
    createNewSession();
    navigate('/');
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteConversation = (convId: string, title: string) => {
    if (!window.confirm(`¿Eliminar la sesión "${title}"?`)) return;
    deleteSession(convId);
  };

  return (
    <div className="h-screen w-full bg-cyber-bg text-cyber-text flex overflow-hidden font-mono">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        conversations={conversations}
        activeConversationId={activeSessionId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={renameSession}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Contenido principal a la derecha */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onNewConversation={handleNewConversation}
        />

        <HomeView
          activeConversation={activeConversation}
          streamMessages={messages}
          isGenerating={isGenerating}
          onSendMessage={sendMessage}
          onStopGeneration={stopGeneration}
          onNewSession={handleNewConversation}
          onRegenerate={regenerateLastMessage}
        />
      </div>
    </div>
  );
};

export default App;
