/**
 * Simple Domain — App (Espacio Conversacional Esencial - Cyberpunk HUD System)
 * Principio de Responsabilidad Única (SRP): Orquestador raíz de vistas, offcanvas y drawer.
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useRouter } from './hooks/useRouter';
import { HomeView } from './views/HomeView';
import { EpisodicMemoryView } from './views/EpisodicMemoryView';
import { Conversation } from './types/conversations';
import { useChat } from './hooks/useChat';

export const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    messages,
    isGenerating,
    searchQuery,
    setSearchQuery,
    activeCartridge,
    setActiveCartridge,
    sendMessage,
    regenerateLastMessage,
    stopGeneration,
    createNewSession,
    renameSession,
    deleteSession,
    isGatewayOffline,
    retryConnection,
  } = useChat();

  const { currentRoute, conversationId, navigate } = useRouter();

  useEffect(() => {
    if (conversationId) {
      if (conversationId !== activeSessionId) {
        setActiveSessionId(conversationId);
      }
    } else if (currentRoute === '/') {
      if (activeSessionId !== null) {
        setActiveSessionId(null);
      }
    }
  }, [conversationId, currentRoute, activeSessionId, setActiveSessionId]);

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
  };

  const handleNewConversation = () => {
    setActiveSessionId(null);
    navigate('/');
  };

  const handleSendMessage = async (text: string) => {
    if (!activeSessionId) {
      const newSession = await createNewSession();
      navigate(`/c/${newSession.id}`);
      await sendMessage(text, newSession.id);
    } else {
      await sendMessage(text, activeSessionId);
    }
  };

  const handleDeleteConversation = (convId: string, title: string) => {
    if (!window.confirm(`¿Eliminar la sesión "${title}"?`)) return;
    deleteSession(convId);
    if (activeSessionId === convId) {
      handleNewConversation();
    }
  };

  return (
    <div className="h-screen w-full bg-[#050508] text-gray-200 flex overflow-hidden font-mono relative">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeSessionId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onOpenEpisodicMemory={() => navigate('/memory-episodic')}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={renameSession}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isGatewayOffline={isGatewayOffline}
          onRetryConnection={retryConnection}
          activeSessionTitle={activeSession?.title}
          activeCartridge={activeCartridge}
          onSelectCartridge={setActiveCartridge}
        />

        {currentRoute === '/memory-episodic' ? (
          <EpisodicMemoryView onBackToChat={() => navigate('/')} />
        ) : (
          <HomeView
            activeConversation={activeConversation}
            streamMessages={messages}
            isGenerating={isGenerating}
            onSendMessage={handleSendMessage}
            onStopGeneration={stopGeneration}
            onRegenerate={regenerateLastMessage}
            isGatewayOffline={isGatewayOffline}
          />
        )}
      </div>
    </div>
  );
};

export default App;
