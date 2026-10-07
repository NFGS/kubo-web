import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ServerSetup } from './components/ServerSetup';
import { ToastProvider } from './components/Toaster';
import { AuthProvider } from './lib/auth';
import { applyNativeConfig, getServerUrl, isNativePlatform, setupServiceWorker } from './lib/native';
import { QueueProvider } from './lib/queue';
import { queryClient } from './lib/query';

// El service worker se registra en la web (app instalable y disponible sin
// conexión desde la primera visita). En la app móvil se desregistra: interfiere
// con el HTTP nativo de Capacitor (ver native.ts).
setupServiceWorker(() => registerSW({ immediate: true }));

// En la app móvil, la base del API apunta al servidor configurado (ADR-0031);
// en la web esto no cambia nada: la base sigue siendo relativa.
applyNativeConfig();

/**
 * Primer arranque de la app móvil: sin servidor configurado se muestra la
 * pantalla de conexión; en la web el portón queda abierto siempre.
 */
function NativeGate({ children }: { children: ReactNode }) {
  const [configurado, setConfigurado] = useState(
    () => !isNativePlatform() || getServerUrl() !== null
  );

  if (!configurado) {
    return (
      <ServerSetup
        onDone={() => {
          applyNativeConfig();
          setConfigurado(true);
        }}
      />
    );
  }

  return <>{children}</>;
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el nodo #root de la aplicación');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <QueueProvider>
            <ToastProvider>
              <NativeGate>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </NativeGate>
            </ToastProvider>
          </QueueProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
