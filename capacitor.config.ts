import type { CapacitorConfig } from '@capacitor/cli';

// Configuracion base de la app movil (ADR-0023, ADR-0031).
// - Assets locales (webDir: dist): la app abre sin red desde el primer arranque.
// - La URL del servidor de cada negocio se pedira en el primer arranque
//   (siguiente tramo de la Fase 1) y se guardara en el dispositivo.
// - Sin server.url: un solo binario por version para todos los negocios.
const config: CapacitorConfig = {
  appId: 'com.nfgs.kubo',
  appName: 'Kubo',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
