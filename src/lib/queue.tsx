import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from './api';
import { countPendingSales, enqueueSale, listPendingSales, removePendingSale } from './offline';
import type { ApiItem, NewSalePayload, Sale } from './types';

interface QueueState {
  pending: number;
  syncing: boolean;
  online: boolean;
  enqueue: (payload: NewSalePayload, label: string) => Promise<void>;
  flush: () => Promise<void>;
}

const QueueContext = createContext<QueueState | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const flushing = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      setPending(await countPendingSales());
    } catch {
      setPending(0);
    }
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) {
      return;
    }
    flushing.current = true;
    setSyncing(true);
    try {
      const queued = await listPendingSales();
      for (const item of queued) {
        try {
          await apiFetch<ApiItem<Sale>>('/sales', {
            method: 'POST',
            body: JSON.stringify(item.payload)
          });
          await removePendingSale(item.id);
        } catch (error) {
          // Un error de validación (producto inexistente, stock insuficiente) no se
          // reintenta: se descarta para no bloquear la cola. Los errores de red sí.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            await removePendingSale(item.id);
          } else {
            break;
          }
        }
      }
      await refreshCount();
      await queryClient.invalidateQueries();
    } finally {
      flushing.current = false;
      setSyncing(false);
    }
  }, [queryClient, refreshCount]);

  const enqueue = useCallback(
    async (payload: NewSalePayload, label: string) => {
      await enqueueSale(payload, label);
      await refreshCount();
    },
    [refreshCount]
  );

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [flush]);

  useEffect(() => {
    if (!online || pending === 0) {
      return;
    }
    const timer = window.setInterval(() => void flush(), 30_000);
    return () => window.clearInterval(timer);
  }, [online, pending, flush]);

  const value = useMemo<QueueState>(
    () => ({ pending, syncing, online, enqueue, flush }),
    [pending, syncing, online, enqueue, flush]
  );

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue(): QueueState {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue debe usarse dentro de QueueProvider');
  }
  return context;
}
