import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from './App';
import { ToastProvider } from './components/Toaster';
import { AuthProvider } from './lib/auth';
import { QueueProvider } from './lib/queue';
import { queryClient } from './lib/query';

// El service worker se registra de inmediato: la app debe quedar instalable y
// disponible sin conexión desde la primera visita.
registerSW({ immediate: true });

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el nodo #root de la aplicación');
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QueueProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </QueueProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
