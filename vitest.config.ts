import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Testing Library limpia el DOM entre pruebas con su `afterEach` global;
    // sin `globals` el DOM se acumulaba y los selectores encontraban de mas.
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Los contratos Pact viven en su propia configuracion (`make pact`).
    exclude: ['src/pact/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      // El gate cubre la logica que se puede probar sin navegador: la cola
      // offline, la politica de errores, el formato y el sistema de diseno.
      include: [
        'src/lib/offline.ts',
        'src/lib/queue-policy.ts',
        'src/lib/format.ts',
        'src/components/ui.tsx'
      ],
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
