/**
 * Simple Domain — App (Shell Modular con Offcanvas y Rutas por Conversación/Dataset)
 * Enrutamiento dinámico /c/:id y /data-sources/:id. Menos de 180 líneas.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { useCoreTelemetry } from './hooks/useCoreTelemetry';
import { useRouter } from './hooks/useRouter';
import { HomeView } from './views/HomeView';
import { ResearchView } from './views/ResearchView';
import { DataSourcesView } from './views/DataSourcesView';
import { DataSourceDetailView } from './views/DataSourceDetailView';
import { PatternsView } from './views/PatternsView';
import { SettingsView } from './views/SettingsView';
import { Conversation } from './types/conversations';
import { modularApi } from './services/modularApi';

export const App: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(() => {
    try { return localStorage.getItem('simple_domain_mode') === 'sandbox'; } catch { return false; }
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const { currentRoute, conversationId, sourceId, navigate } = useRouter();
  const telemetry = useCoreTelemetry(); const isOnline = telemetry.connectionStatus === 'ONLINE';

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

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    modularApi.getSystemMode().then((r) => {
      setIsSandboxMode(r?.mode === 'sandbox');
      try { localStorage.setItem('simple_domain_mode', r?.mode || 'chat'); } catch {}
    }).catch(() => {});
    const onEvt = () => { try { setIsSandboxMode(localStorage.getItem('simple_domain_mode') === 'sandbox'); } catch {} };
    window.addEventListener('system-mode-changed', onEvt);
    return () => window.removeEventListener('system-mode-changed', onEvt);
  }, []);

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

  const handleNavigate = (route: string) => {
    navigate(route);
    setIsMobileSidebarOpen(false);
  };

  const handleNewConversation = async () => {
    try {
      const created = await modularApi.createConversation();
      setConversations((prev) => [created, ...prev]);
      setActiveConversation(created);
      setIsSandboxMode(false);
      try { localStorage.setItem('simple_domain_mode', 'chat'); } catch {}
      modularApi.setSystemMode('chat').catch(() => {});
      navigate(`/c/${created.id}`);
      setIsMobileSidebarOpen(false);
    } catch { /* fallback */ }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setIsSandboxMode(false);
    try { localStorage.setItem('simple_domain_mode', 'chat'); } catch {}
    modularApi.setSystemMode('chat').catch(() => {});
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
          if (rem.length > 0) { setActiveConversation(rem[0]); navigate(`/c/${rem[0].id}`); }
          else { setActiveConversation(null); navigate('/'); }
        }
        return rem;
      });
    } catch (err) { alert(`Error al eliminar: ${err instanceof Error ? err.message : 'Error'}`); }
  };

  const handleToggleSandboxMode = () => {
    setIsSandboxMode((prev) => {
      const next = !prev;
      const m = next ? 'sandbox' : 'chat';
      try { localStorage.setItem('simple_domain_mode', m); } catch {}
      modularApi.setSystemMode(m).catch(() => {});
      return next;
    });
  };

  const renderActiveView = () => {
    if (sourceId || (currentRoute.startsWith('/data-sources/') && currentRoute !== '/data-sources')) {
      const sid = sourceId || currentRoute.replace('/data-sources/', '').trim();
      if (sid && sid !== 'details') return <DataSourceDetailView sourceId={sid} onBack={() => navigate('/data-sources')} />;
    }
    if (currentRoute === '/research') return <ResearchView />;
    if (currentRoute === '/data-sources') return <DataSourcesView />;
    if (currentRoute === '/patterns') return <PatternsView />;
    if (currentRoute === '/settings') return <SettingsView />;

    return (
      <HomeView
        isOnline={isOnline} activeConversation={activeConversation}
        onRefreshActive={handleRefreshActive} onNewSession={handleNewConversation}
        isSandboxMode={isSandboxMode} onToggleSandboxMode={handleToggleSandboxMode}
      />
    );
  };

  return (
    <div className="h-screen w-full bg-cyber-bg text-cyber-text flex overflow-hidden font-mono">
      <Sidebar
        currentRoute={currentRoute} onNavigate={handleNavigate}
        isMobileOpen={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenDiagnostics={() => { setIsMobileSidebarOpen(false); setIsDiagnosticsOpen(true); }}
        isBackendOnline={isOnline} conversations={conversations}
        activeConversationId={activeConversation?.id || conversationId || null}
        onSelectConversation={handleSelectConversation} onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation} isSandboxMode={isSandboxMode}
        onToggleSandboxMode={handleToggleSandboxMode}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          onNewConversation={handleNewConversation}
          telemetry={telemetry}
        />
        {renderActiveView()}
      </div>
      <DiagnosticsModal isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} telemetry={telemetry} />
    </div>
  );
};

export default App;
