/**
 * Simple Domain — App (Home con Sidebar Lateral) nada mas la parte lateral 
 * Integra navegación lateral estilo ChatGPT, navbar minimalista y diagnóstico modal.
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CoreVisualization } from './components/CoreVisualization';
import { CommandInput } from './components/CommandInput';
import { StatusBar } from './components/StatusBar';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { useCoreTelemetry } from './hooks/useCoreTelemetry';

export const App: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  const telemetry = useCoreTelemetry();
  const isOnline = telemetry.connectionStatus === 'ONLINE';

  return (
    <div className="h-screen w-full bg-cyber-bg text-cyber-text flex overflow-hidden font-mono select-none">
      {/* Navegación Lateral Izquierda */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenDiagnostics={() => {
          setIsMobileSidebarOpen(false);
          setIsDiagnosticsOpen(true);
        }}
        isBackendOnline={isOnline}
      />

      {/* Área Principal de Contenido */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Navbar Minimalista */}
        <TopBar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          telemetry={telemetry}
        />

        {/* Visualización Central (Home) */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full overflow-y-auto">
          <CoreVisualization />
        </main>

        {/* Terminal de Comandos Inferior */}
        <section className="w-full relative z-20 shrink-0">
          <CommandInput />
        </section>

        {/* Pie Técnico */}
        <StatusBar isOnline={isOnline} />
      </div>

      {/* Modal de Diagnóstico y Telemetría Bajo Demanda */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        telemetry={telemetry}
      />
    </div>
  );
};

export default App;
