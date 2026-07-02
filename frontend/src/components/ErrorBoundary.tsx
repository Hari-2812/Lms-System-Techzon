import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import api from '../services/api';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React component error:', error, errorInfo);
    // Log to backend logs system
    api.post('/logs/runtime-error', {
      message: error.message || 'React component render crash',
      stack: error.stack || '',
      url: window.location.href,
      userId: '',
      browser: navigator.userAgent,
      timestamp: new Date().toISOString()
    }).catch(err => console.error('Failed to log runtime error to server:', err));
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#070312] text-white p-6 font-poppins relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[130px]" />
          
          <div className="w-full max-w-md glass-card p-8 border border-white/5 text-center space-y-6 relative z-10 dark:bg-card-dark/80">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl shadow-lg shadow-amber-500/15 animate-float">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                An unexpected application rendering error occurred. You can reload the page or return to the main dashboard.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-left">
                <p className="text-[10px] font-mono text-red-400 break-all leading-normal">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-4 h-4" /> Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 dark:bg-card-dark dark:border-border-dark dark:text-slate-300 text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition"
              >
                <Home className="w-4 h-4" /> Go Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
