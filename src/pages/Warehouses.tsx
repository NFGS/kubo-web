import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Building2, Trash2 } from 'lucide-react';
import { ApiError, apiFetch } from '../lib/api';
import { dateTime } from '../lib/format';
import { useToast } from '../components/Toaster';
import type { ApiItem, Product, Transfer, Warehouse } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Select, Spinner } from '../components/ui';

interface TransferForm {
  from: string;
  to: string;
  product: string;
  quantity: string;
  notes: string;
}

const emptyTransfer: TransferForm = { from: '', to: '', product: '', quantity: '1', notes: '' };

/**
 * Bodegas y transferencias (P-22, ADR-0016).
 *
 * Una transferencia mueve existencias entre dos bodegas del mismo negocio: el
 * total del producto no cambia, solo de dónde está.
 */
export function WarehousesPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [form, setForm] = useState<TransferForm>(emptyTransfer);

  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiFetch<{ data: Warehouse[] }>('/warehouses')
  });

  const products = useQuery({
    queryKey: ['products', 'bodegas'],
    queryFn: () => apiFetch<{ data: Product[] }>('/products')
  });

  const transfers = useQuery({
    queryKey: ['transfers'],
    queryFn: () => apiFetch<{ data: Transfer[] }>('/transfers')
  });

  const createWarehouse = useMutation({
    mutationFn: () =>
      apiFetch<ApiItem<Warehouse>>('/warehouses', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      }),
    onSuccess: async () => {
      setName('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      notify('Bodega creada', 'success');
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'No fue posible crear la bodega')
  });

  const removeWarehouse = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/warehouses/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      notify('Bodega borrada', 'success');
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'No fue posible borrar la bodega')
  });

  const createTransfer = useMutation({
    mutationFn: () =>
      apiFetch<ApiItem<Transfer>>('/transfers', {
        method: 'POST',
        body: JSON.stringify({
          from_warehouse_id: form.from,
          to_warehouse_id: form.to,
          notes: form.notes.trim() || undefined,
          items: [{ product_id: form.product, quantity: Number(form.quantity || '0') }]
        })
      }),
    onSuccess: async () => {
      setForm(emptyTransfer);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      notify('Transferencia completada', 'success');
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'No fue posible transferir')
  });

  const lista = warehouses.data?.data ?? [];
  const nombreBodega = (id: string): string => lista.find((row) => row.id === id)?.name ?? '—';
  const nombreProducto = (id: string): string =>
    products.data?.data.find((row) => row.id === id)?.name ?? '—';

  const puedeTransferir =
    form.from !== '' && form.to !== '' && form.from !== form.to && form.product !== '';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Bodegas y transferencias</h1>
        <p className="text-sm text-slate-600">
          Mueve existencias entre tus bodegas o locales; el total del negocio no cambia.
        </p>
      </header>

      <ErrorNote message={error} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Bodegas">
          {warehouses.isLoading ? (
            <Spinner label="Cargando bodegas…" />
          ) : (
            <div className="space-y-4">
              <ul className="divide-y divide-slate-100">
                {lista.map((warehouse) => (
                  <li key={warehouse.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <Building2 className="h-4 w-4 text-slate-400" aria-hidden />
                        {warehouse.name}
                        {warehouse.is_default && <Badge tone="info">Por defecto</Badge>}
                      </p>
                      {warehouse.address && (
                        <p className="text-xs text-slate-600">{warehouse.address}</p>
                      )}
                    </div>
                    {!warehouse.is_default && (
                      <button
                        type="button"
                        aria-label={`Borrar ${warehouse.name}`}
                        onClick={() => removeWarehouse.mutate(warehouse.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  createWarehouse.mutate();
                }}
              >
                <Field label="Nueva bodega">
                  <Input
                    value={name}
                    required
                    placeholder="Bodega norte"
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <Button type="submit" loading={createWarehouse.isPending} disabled={!name.trim()}>
                  Crear
                </Button>
              </form>
            </div>
          )}
        </Card>

        <Card title="Transferir existencias">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createTransfer.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Desde">
                <Select
                  value={form.from}
                  required
                  onChange={(event) => setForm({ ...form, from: event.target.value })}
                >
                  <option value="">Elige bodega</option>
                  {lista.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Hacia">
                <Select
                  value={form.to}
                  required
                  onChange={(event) => setForm({ ...form, to: event.target.value })}
                >
                  <option value="">Elige bodega</option>
                  {lista.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Producto">
              <Select
                value={form.product}
                required
                onChange={(event) => setForm({ ...form, product: event.target.value })}
              >
                <option value="">Elige producto</option>
                {(products.data?.data ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cantidad">
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                />
              </Field>
              <Field label="Nota">
                <Input
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </Field>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={createTransfer.isPending} disabled={!puedeTransferir}>
                <ArrowRightLeft className="h-4 w-4" aria-hidden />
                Transferir
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card title="Últimas transferencias">
        {transfers.isLoading ? (
          <Spinner label="Cargando transferencias…" />
        ) : (transfers.data?.data ?? []).length === 0 ? (
          <EmptyState
            title="Sin transferencias"
            description="Cuando muevas existencias entre bodegas aparecerán aquí."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3">Desde</th>
                  <th className="pb-3">Hacia</th>
                  <th className="pb-3">Producto</th>
                  <th className="pb-3 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(transfers.data?.data ?? []).map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-slate-50">
                    <td className="py-3 text-slate-600">
                      {transfer.completed_at ? dateTime(transfer.completed_at) : '—'}
                    </td>
                    <td className="py-3 text-slate-700">
                      {nombreBodega(transfer.from_warehouse_id)}
                    </td>
                    <td className="py-3 text-slate-700">{nombreBodega(transfer.to_warehouse_id)}</td>
                    <td className="py-3 text-slate-700">
                      {transfer.items.map((item) => nombreProducto(item.product_id)).join(', ')}
                    </td>
                    <td className="py-3 text-right text-slate-700">
                      {transfer.items.map((item) => item.quantity).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
