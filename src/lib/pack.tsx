import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { ApiItem, Pack } from './types';

/**
 * Paquete de configuracion activo (P-17, ADR-0013).
 *
 * El vertical del negocio adapta la terminologia de la interfaz. Mientras
 * llega la respuesta se usa el paquete por defecto: la interfaz nunca se queda
 * sin etiquetas por un problema de red.
 */
const RESPALDO: Pack = {
  key: 'retail',
  name: 'Retail',
  description: 'Tienda de barrio: productos con código de barras e inventario.',
  product_label: 'Producto',
  product_label_plural: 'Productos',
  default_tax_rate: '19.00',
  tracks_stock: true,
  pos_flow: 'sale'
};

const PackContext = createContext<Pack>(RESPALDO);

export function PackProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ['pack', 'current'],
    queryFn: () => apiFetch<ApiItem<Pack>>('/packs/current'),
    staleTime: 5 * 60_000
  });

  return <PackContext.Provider value={data?.data ?? RESPALDO}>{children}</PackContext.Provider>;
}

export function usePack(): Pack {
  return useContext(PackContext);
}
