/**
 * Simple Domain — App (Espacio Conversacional Esencial)
 * Interfaz enfocada únicamente en los chats con persistencia en localStorage.
 */

import React, { useState } from 'react';
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
    sendMessage,
    stopGeneration,
    createNewSession,
    deleteSession,
  } = useChat();

  const { navigate } = useRouter();

  // Convertimos las sesiones de localStorage a la interfaz visual Conversation
  const conversations: Conversation[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    created_at: new Date(s.updatedAt).toISOString(),
    updated_at: new Date(s.updatedAt).toISOString(),
    messages: s.messages.map((m, idx) => ({
      id: `${s.id}-${idx}`,
      conversation_id: s.id,
      role: (m.role === 'tool' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
      content: m.content,
      created_at: new Date(s.updatedAt).toISOString(),
    })),
    archive_ids: [],
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
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteConversation = (convId: string, title: string) => {
    if (!window.confirm(`¿Eliminar la sesión "${title}"?`)) return;
    deleteSession(convId);
  };

  return (
    <div className="h-screen w-full bg-cyber-bg text-cyber-text flex overflow-hidden font-mono">
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          onNewConversation={handleNewConversation}
        />

        <div className="flex-1 flex min-w-0 overflow-hidden relative">
          <Sidebar
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            conversations={conversations}
            activeConversationId={activeSessionId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />

          <HomeView
            activeConversation={activeConversation}
            streamMessages={messages}
            isGenerating={isGenerating}
            onSendMessage={sendMessage}
            onStopGeneration={stopGeneration}
            onNewSession={handleNewConversation}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
