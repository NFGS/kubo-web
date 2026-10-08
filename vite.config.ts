import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kubo — ERP + CRM para PYMES',
        short_name: 'Kubo',
        description:
          'Gestiona clientes, inventario y ventas desde el local, incluso sin internet.',
        lang: 'es-CO',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity', 'finance'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Lecturas del negocio: primero la red, y si no hay, lo ultimo cacheado.
            urlPattern: /\/api\/v1\/(products|customers|dashboard)(\/|$)/,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'kubo-lecturas',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, el front habla con el gateway como si fuera el mismo origen.
      '/api': { target: 'http://localhost:9080', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900
  }
});
