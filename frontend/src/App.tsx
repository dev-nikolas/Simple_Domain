/**
 * Simple Domain — App (Shell Modular con Offcanvas y Sesiones Conversacionales)
 */

import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { useCoreTelemetry } from './hooks/useCoreTelemetry';
import { useRouter } from './hooks/useRouter';
import { HomeView } from './views/HomeView';
import { ResearchView } from './views/ResearchView';
import { DataSourcesView } from './views/DataSourcesView';
import { PatternsView } from './views/PatternsView';
import { SettingsView } from './views/SettingsView';
import { Conversation } from './types/conversations';
import { modularApi } from './services/modularApi';

export const App: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const { currentRoute, navigate } = useRouter();
  const telemetry = useCoreTelemetry();
  const isOnline = telemetry.connectionStatus === 'ONLINE';

  const loadConversations = async () => {
    try {
      const list = await modularApi.getConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversation) {
        setActiveConversation(list[0]);
      }
    } catch {
      // Ignorar fallback
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleRefreshActive = async () => {
    try {
      const list = await modularApi.getConversations();
      setConversations(list);
      if (activeConversation) {
        const refreshed = await modularApi.getConversation(activeConversation.id);
        setActiveConversation(refreshed);
      } else if (list.length > 0) {
        setActiveConversation(list[0]);
      }
    } catch {
      // Ignorar fallback
    }
  };

  const handleNewConversation = async () => {
    try {
      const created = await modularApi.createConversation();
      setConversations((prev) => [created, ...prev]);
      setActiveConversation(created);
      navigate('/');
    } catch {
      // Ignorar fallback
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    navigate('/');
    try {
      const fresh = await modularApi.getConversation(conv.id);
      setActiveConversation(fresh);
    } catch {
      // Ignorar fallback
    }
  };

  const renderActiveView = () => {
    switch (currentRoute) {
      case '/research':
        return <ResearchView />;
      case '/data-sources':
        return <DataSourcesView />;
      case '/patterns':
        return <PatternsView />;
      case '/settings':
        return <SettingsView />;
      case '/':
      default:
        return (
          <HomeView
            isOnline={isOnline}
            activeConversation={activeConversation}
            onRefreshActive={handleRefreshActive}
            onNewSession={handleNewConversation}
          />
        );
    }
  };

  return (
    <div className="h-screen w-full bg-cyber-bg text-cyber-text flex overflow-hidden font-mono select-none">
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={navigate}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenDiagnostics={() => {
          setIsMobileSidebarOpen(false);
          setIsDiagnosticsOpen(true);
        }}
        isBackendOnline={isOnline}
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          onNewConversation={handleNewConversation}
          telemetry={telemetry}
        />

        {renderActiveView()}
      </div>

      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        telemetry={telemetry}
      />
    </div>
  );
};

export default App;
