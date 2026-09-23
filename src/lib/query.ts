import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente de consultas compartido. Los datos del servidor se consideran
 * frescos por 15 segundos: suficiente para un POS donde varias cajas trabajan
 * sobre el mismo inventario, sin castigar la red del local.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: true
    },
    mutations: {
      retry: 0
    }
  }
});
