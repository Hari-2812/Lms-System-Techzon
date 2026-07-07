import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './redux/store';
import { initializeTheme } from './redux/authSlice';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import api from './services/api';
import { Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import './App.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | 'loading' | 'rate-limited'>('loading');

  const checkHealth = async () => {
    setIsBackendOnline('loading');
    try {
      const res = await api.get('/health');
      if (res.data.status === 'healthy' || res.data.status === 'OK' || res.data.status === 'UP') {
        setIsBackendOnline(true);
      } else {
        setIsBackendOnline(false);
      }
    } catch (err: any) {
      console.error('LMS backend offline verification failed:', err);
      if (err.response) {
        if (err.response.status === 429) {
          setIsBackendOnline('rate-limited');
        } else if (err.response.status >= 500) {
          setIsBackendOnline(false);
        } else {
          // If we got a 4xx response (like 401, 404), the backend is online!
          setIsBackendOnline(true);
        }
      } else {
        // Network error, backend is truly offline
        setIsBackendOnline(false);
      }
    }
  };

  useEffect(() => {
    dispatch(initializeTheme());
    checkHealth();
  }, [dispatch]);

  if (isBackendOnline === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070312] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs text-slate-400 mt-2 font-poppins">Connecting to Techzon LMS Service...</p>
      </div>
    );
  }

  if (isBackendOnline === 'rate-limited') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070312] text-white p-6 font-poppins relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-950/10 blur-[130px]" />
        
        <div className="w-full max-w-md glass-card p-8 border border-white/5 text-center space-y-6 relative z-10 dark:bg-card-dark/80">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl shadow-lg shadow-amber-500/15 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold">Backend Rate Limited</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-semibold">
              Backend is temporarily rate limited. Retrying...
            </p>
          </div>

          <button
            onClick={checkHealth}
            className="w-full btn-accent py-3.5 rounded-xl font-poppins font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Try Reconnecting
          </button>
        </div>
      </div>
    );
  }

  if (isBackendOnline === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070312] text-white p-6 font-poppins relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-950/10 blur-[130px]" />
        
        <div className="w-full max-w-md glass-card p-8 border border-white/5 text-center space-y-6 relative z-10 dark:bg-card-dark/80">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl shadow-lg shadow-red-500/15 animate-float">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold">LMS System Offline</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              We are unable to establish a secure database connection to the backend server. Please verify your internet connection or host properties.
            </p>
          </div>

          <button
            onClick={checkHealth}
            className="w-full btn-accent py-3.5 rounded-xl font-poppins font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Try Reconnecting
          </button>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Toaster position="top-right" reverseOrder={false} />
            <AppContent />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
