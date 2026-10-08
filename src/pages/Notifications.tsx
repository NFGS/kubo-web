import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BellRing, MessageCircle, PackageSearch } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { dateTime } from '../lib/format';
import type { AppNotification } from '../lib/types';
import { Badge, Card, EmptyState, ErrorNote, Spinner } from '../components/ui';

const KIND_LABELS: Record<string, string> = {
  LOW_STOCK: 'Stock bajo',
  SALE: 'Venta',
  PURCHASE: 'Compra',
  DAILY_SUMMARY: 'Resumen del día'
};

const CHANNEL_LABELS: Record<string, string> = {
  LOG: 'Buzón',
  EMAIL: 'Correo',
  WHATSAPP: 'WhatsApp'
};

/**
 * Buzón de notificaciones (P-19).
 *
 * Es lo que el negocio debe saber sin tener que mirar un tablero: stock bajo,
 * resumen del día. El canal lo decide el adaptador del ERP; aquí se muestra lo
 * que se entregó (o lo que un proveedor real habría enviado).
 */
export function NotificationsPage() {
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<{ data: AppNotification[] }>('/notifications'),
    refetchInterval: 60_000
  });

  const rows = (notifications.data?.data ?? []).filter(
    (notification) => !onlyLowStock || notification.kind === 'LOW_STOCK'
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-5 py-4">
        <div>
          <h1 className="text-lg font-bold text-white">Notificaciones</h1>
          <p className="mt-0.5 text-sm text-mist">
            Avisos del negocio: inventario que se agota y movimientos importantes.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-mist">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 accent-kubo-500"
            checked={onlyLowStock}
            onChange={(event) => setOnlyLowStock(event.target.checked)}
          />
          Solo stock bajo
        </label>
      </header>

      <ErrorNote
        message={
          notifications.isError
            ? notifications.error instanceof Error
              ? notifications.error.message
              : 'No fue posible cargar las notificaciones'
            : null
        }
      />

      <Card>
        {notifications.isLoading ? (
          <Spinner label="Cargando notificaciones…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Sin avisos"
            description="Cuando un producto cruce su stock mínimo aparecerá aquí."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((notification) => (
              <li key={notification.id} className="flex gap-3 py-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kubo-50 text-kubo-600">
                  {notification.kind === 'LOW_STOCK' ? (
                    <PackageSearch className="h-4 w-4" aria-hidden />
                  ) : notification.channel === 'WHATSAPP' ? (
                    <MessageCircle className="h-4 w-4" aria-hidden />
                  ) : (
                    <BellRing className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{notification.subject}</p>
                    <Badge tone={notification.kind === 'LOW_STOCK' ? 'warning' : 'info'}>
                      {KIND_LABELS[notification.kind] ?? notification.kind}
                    </Badge>
                    <span className="text-xs text-slate-600">
                      {CHANNEL_LABELS[notification.channel] ?? notification.channel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {notification.sent_at ? dateTime(notification.sent_at) : 'Pendiente'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
