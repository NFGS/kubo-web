import { defineConfig, devices } from '@playwright/test';

/**
 * E2E de la PWA (P-10) con auditoria de accesibilidad (P-26).
 *
 * Usa el Chrome del sistema (`channel: 'chrome'`) en lugar de descargar un
 * navegador propio: el equipo ya lo tiene para generar el PDF de la
 * documentacion, y asi el gate no depende de una descarga extra.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.KUBO_WEB_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      // En local se usa el Chrome del sistema; en CI se instala chromium y se
      // elige con PLAYWRIGHT_CHANNEL=chromium.
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: (process.env.PLAYWRIGHT_CHANNEL ?? 'chrome') as 'chrome' | 'chromium'
      }
    }
  ]
});
