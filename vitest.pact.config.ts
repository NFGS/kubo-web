import { defineConfig } from 'vitest/config';

// Los contratos del consumidor viven aparte del gate de cobertura: generan los
// archivos pact y no miden codigo de la aplicacion. Se ejecutan con `make pact`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/pact/**/*.test.ts'],
    coverage: { enabled: false },
    testTimeout: 30_000
  }
});
