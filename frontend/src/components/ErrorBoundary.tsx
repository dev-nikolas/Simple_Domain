/**
 * Simple Domain — ErrorBoundary para captura robusta de fallos en interfaz
 * Menos de 180 líneas.
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un fallo:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-rose-500/50 bg-rose-950/30 text-rose-300 cut-corner-sm space-y-3 font-mono text-xs">
          <div className="flex items-center space-x-2 text-rose-400 font-bold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{this.props.fallbackTitle || 'Error de visualización en el componente'}</span>
          </div>
          <p className="text-cyber-muted text-[11px]">
            {this.state.error?.message || 'Ocurrió un error inesperado al renderizar.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/20 border border-rose-500 text-white font-bold hover:bg-rose-500/40 text-xs cut-corner-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REINTENTAR RENDERIZADO</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
