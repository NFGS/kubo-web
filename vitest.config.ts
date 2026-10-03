import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // El gate cubre la logica que se puede probar sin navegador: la cola
      // offline (IndexedDB) y la politica de errores de sincronizacion.
      include: ['src/lib/offline.ts', 'src/lib/queue-policy.ts'],
      reporter: ['text'],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        // Las ramas bajas son los manejadores de error de IndexedDB
        // (onupgradeneeded/onerror), que no se pueden ejercitar sin simular
        // fallos del motor; el flujo real lo cubre el E2E offline.
        branches: 65
      }
    }
  }
});
