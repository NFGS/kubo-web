import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, Unlock } from 'lucide-react';
import { ApiError, apiFetch } from '../lib/api';
import { dateTime, money, number } from '../lib/format';
import { useToast } from '../components/Toaster';
import type { ApiItem, ApiList, CashSession } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Spinner } from '../components/ui';

interface ApiCurrent {
  data: CashSession | null;
}

/**
 * Caja (P-16): apertura con base, cierre con arqueo.
 *
 * El esperado se calcula con las ventas del turno (base + efectivo cobrado −
 * anuladas). La diferencia con lo contado queda registrada: es el dato que el
 * dueño revisa al final del dia.
 */
export function CashPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [opening, setOpening] = useState('0');
  const [counted, setCounted] = useState('');
  const [error, setError] = useState<string | null>(null);

  const current = useQuery({
    queryKey: ['cash', 'current'],
    queryFn: () => apiFetch<ApiCurrent>('/cash-sessions/current')
  });

  const history = useQuery({
    queryKey: ['cash', 'history'],
    queryFn: () => apiFetch<ApiList<CashSession>>('/cash-sessions?limit=20')
  });

  const openSession = useMutation({
    mutationFn: () =>
      apiFetch<ApiItem<CashSession>>('/cash-sessions/open', {
        method: 'POST',
        body: JSON.stringify({ opening_amount: Number(opening || '0') })
      }),
    onSuccess: async () => {
      notify('Caja abierta', 'success');
      setOpening('0');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible abrir la caja');
    }
  });

  const closeSession = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ApiItem<CashSession>>(`/cash-sessions/${id}/close`, {
        method: 'POST',
        body: JSON.stringify({ counted_amount: Number(counted || '0') })
      }),
    onSuccess: async (response) => {
      const difference = Number(response.data.difference ?? '0');
      notify(
        difference === 0
          ? 'Caja cerrada y cuadrada'
          : `Caja cerrada con una diferencia de ${money(difference)}`,
        difference === 0 ? 'success' : 'error'
      );
      setCounted('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible cerrar la caja');
    }
  });

  const session = current.data?.data ?? null;
  const summary = session?.summary;
  const rows = history.data?.data ?? [];

  function handleOpen(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    openSession.mutate();
  }

  function handleClose(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!session) {
      return;
    }
    setError(null);
    closeSession.mutate(session.id);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-ink-900 px-5 py-4">
        <h1 className="text-lg font-bold text-white">Caja</h1>
        <p className="mt-0.5 text-sm text-mist">
          Apertura con base, cierre con arqueo. Las ventas del turno se ligan a la sesión.
        </p>
      </header>

      <ErrorNote message={error} />

      {current.isLoading ? (
        <Spinner label="Consultando la caja…" />
      ) : session === null ? (
        <Card>
          <h2 className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Abrir caja
          </h2>
          <form onSubmit={handleOpen} className="space-y-4">
            <Field label="Base inicial en efectivo" hint="Con cuánto dinero abre la caja">
              <Input
                type="number"
                min={0}
                step={1000}
                required
                value={opening}
                onChange={(event) => setOpening(event.target.value)}
              />
            </Field>
            <Button type="submit" loading={openSession.isPending}>
              <Unlock className="h-4 w-4" aria-hidden />
              Abrir caja
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Turno abierto
            </h2>
            <Badge tone="success">Abierta desde {dateTime(session.opened_at)}</Badge>
          </div>

          <dl className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-xs text-slate-600">Base inicial</dt>
              <dd className="text-lg font-semibold text-slate-800">{money(session.opening_amount)}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-xs text-slate-600">Efectivo cobrado</dt>
              <dd className="text-lg font-semibold text-slate-800">{money(summary?.cash_sales ?? 0)}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-xs text-slate-600">Otros medios</dt>
              <dd className="text-lg font-semibold text-slate-800">{money(summary?.other_sales ?? 0)}</dd>
            </div>
            <div className="rounded-xl bg-kubo-50 px-4 py-3">
              <dt className="text-xs text-kubo-700">Efectivo esperado en caja</dt>
              <dd className="text-lg font-semibold text-kubo-800">{money(summary?.expected_cash ?? 0)}</dd>
            </div>
          </dl>

          <p className="mb-4 text-xs text-slate-600">
            {number(summary?.sales_count ?? 0)} venta(s) en el turno
            {summary && summary.voided_count > 0 ? ` · ${number(summary.voided_count)} anulada(s)` : ''} ·
            las anuladas descuentan del efectivo esperado.
          </p>

          <form onSubmit={handleClose} className="flex flex-wrap items-end gap-3">
            <div className="w-56">
              <Field label="Efectivo contado" hint="Lo que hay físicamente en la caja">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  required
                  value={counted}
                  onChange={(event) => setCounted(event.target.value)}
                />
              </Field>
            </div>
            <Button type="submit" loading={closeSession.isPending}>
              <LockKeyhole className="h-4 w-4" aria-hidden />
              Cerrar caja y arquear
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Historial</h2>
        {history.isLoading ? (
          <Spinner label="Cargando turnos…" />
        ) : rows.length === 0 ? (
          <EmptyState title="Sin turnos" description="Abre la caja para comenzar a operar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-periwinkle text-left text-xs font-semibold tracking-wider text-ink-800 uppercase [&>th]:px-3 [&>th]:py-2.5">
                  <th className="pb-3">Apertura</th>
                  <th className="pb-3">Cierre</th>
                  <th className="pb-3 text-right">Base</th>
                  <th className="pb-3 text-right">Esperado</th>
                  <th className="pb-3 text-right">Contado</th>
                  <th className="pb-3 text-right">Diferencia</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rowline [&>tr>td]:px-3">
                {rows.map((row) => {
                  const difference = Number(row.difference ?? '0');
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-3 text-slate-600">{dateTime(row.opened_at)}</td>
                      <td className="py-3 text-slate-600">{dateTime(row.closed_at)}</td>
                      <td className="py-3 text-right text-slate-700">{money(row.opening_amount)}</td>
                      <td className="py-3 text-right text-slate-700">{money(row.expected_amount ?? 0)}</td>
                      <td className="py-3 text-right text-slate-700">{money(row.counted_amount ?? 0)}</td>
                      <td className="py-3 text-right">
                        {row.status === 'CLOSED' ? (
                          <span className={difference === 0 ? 'text-green-700' : 'text-red-700'}>
                            {money(difference)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {row.status === 'OPEN' ? (
                          <Badge tone="success">Abierta</Badge>
                        ) : (
                          <Badge tone="neutral">Cerrada</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
