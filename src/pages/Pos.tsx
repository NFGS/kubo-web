import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CloudOff, Minus, Plus, Printer, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { ApiError, apiFetch } from '../lib/api';
import { money, number, paymentLabels } from '../lib/format';
import { printReceipt } from '../lib/receipt';
import { useQueue } from '../lib/queue';
import { useToast } from '../components/Toaster';
import type { ApiItem, ApiList, Customer, NewSalePayload, Product, Sale } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Select, Spinner } from '../components/ui';

interface CartLine {
  product: Product;
  quantity: number;
}

export function PosPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { online, pending, enqueue } = useQueue();
  const [term, setTerm] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const products = useQuery({
    queryKey: ['products', 'pos'],
    queryFn: () => apiFetch<ApiList<Product>>('/products')
  });

  const customers = useQuery({
    queryKey: ['customers', 'pos'],
    queryFn: () => apiFetch<ApiList<Customer>>('/customers')
  });

  const submit = useMutation({
    mutationFn: (payload: NewSalePayload) =>
      apiFetch<ApiItem<Sale>>('/sales', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async (response) => {
      setLastSale(response.data);
      notify(`Venta ${response.data.number} registrada`, 'success');
      setCart([]);
      setNotes('');
      setCustomerId('');
      await queryClient.invalidateQueries();
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible registrar la venta');
    }
  });

  const filtered = useMemo(() => {
    const rows = products.data?.data ?? [];
    const needle = term.trim().toLowerCase();
    if (!needle) {
      return rows.filter((product) => product.active);
    }
    return rows.filter(
      (product) =>
        product.active &&
        (product.name.toLowerCase().includes(needle) || product.sku.toLowerCase().includes(needle))
    );
  }, [products.data, term]);

  const totals = useMemo(() => {
    return cart.reduce(
      (acc, line) => {
        const lineTotal = Number(line.product.price) * line.quantity;
        const rate = Number(line.product.tax_rate);
        const tax = rate > 0 ? (lineTotal * rate) / (100 + rate) : 0;
        return {
          total: acc.total + lineTotal,
          tax: acc.tax + tax
        };
      },
      { total: 0, tax: 0 }
    );
  }, [cart]);

  // Las validaciones y los avisos viven FUERA de las funciones actualizadoras de
  // estado: React puede invocarlas mas de una vez (StrictMode), y un efecto
  // secundario ahi dentro duplicaria los avisos y romperia la pureza esperada.
  function addProduct(product: Product): void {
    setError(null);
    const existing = cart.find((line) => line.product.id === product.id);

    if (existing) {
      if (existing.quantity >= product.stock) {
        notify(`Solo hay ${product.stock} unidades de ${product.name}`, 'error');
        return;
      }
      setCart((current) =>
        current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        )
      );
      return;
    }

    if (product.stock <= 0) {
      notify(`${product.name} no tiene existencias`, 'error');
      return;
    }
    setCart((current) => [...current, { product, quantity: 1 }]);
  }

  function changeQuantity(productId: string, delta: number): void {
    const line = cart.find((row) => row.product.id === productId);
    if (!line) {
      return;
    }

    const next = line.quantity + delta;
    if (next > line.product.stock) {
      notify(`Stock disponible: ${line.product.stock}`, 'error');
      return;
    }

    setCart((current) =>
      current
        .map((row) => (row.product.id === productId ? { ...row, quantity: next } : row))
        .filter((row) => row.quantity > 0)
    );
  }

  async function handleCheckout(): Promise<void> {
    if (cart.length === 0) {
      return;
    }
    setError(null);

    const customer = customers.data?.data.find((row) => row.id === customerId);
    const payload: NewSalePayload = {
      items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
      customer_id: customer?.id,
      customer_name: customer?.name,
      payment_method: paymentMethod,
      notes: notes.trim() ? notes.trim() : undefined
    };

    const label = `${cart.length} producto(s) · ${money(totals.total)}`;

    if (!online) {
      await enqueue(payload, label);
      notify('Sin internet: la venta quedó en cola y se enviará al reconectar', 'info');
      setCart([]);
      setNotes('');
      return;
    }

    try {
      await submit.mutateAsync(payload);
    } catch (caught) {
      // Fallo de red (no de negocio): se guarda en la cola offline.
      if (!(caught instanceof ApiError)) {
        await enqueue(payload, label);
        notify('No hubo respuesta del servidor: venta guardada en cola', 'info');
        setCart([]);
        setNotes('');
      }
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Punto de venta</h1>
            <p className="text-sm text-slate-600">
              Toca un producto para agregarlo al carrito. El inventario se descuenta al cobrar.
            </p>
          </div>
          {!online && (
            <Badge tone="warning">
              <span className="inline-flex items-center gap-1">
                <CloudOff className="h-3.5 w-3.5" aria-hidden /> Modo sin conexión
              </span>
            </Badge>
          )}
        </header>

        <Card>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-slate-400" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Buscar producto por nombre o código"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>

          {products.isLoading ? (
            <Spinner label="Cargando catálogo…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Sin productos disponibles"
              description="Crea productos en la sección Productos para poder vender."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-kubo-500 hover:shadow-sm"
                >
                  <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-600">{product.sku}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-kubo-700">{money(product.price)}</span>
                    {product.low_stock ? (
                      <Badge tone="warning">{number(product.stock)} u.</Badge>
                    ) : (
                      <Badge tone="neutral">{number(product.stock)} u.</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Carrito">
          <ErrorNote message={error} />

          {lastSale && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
              <span>
                Última venta: <strong>{lastSale.number}</strong> por {money(lastSale.total)} (
                {paymentLabels[lastSale.payment_method] ?? lastSale.payment_method})
              </span>
              <Button variant="secondary" onClick={() => printReceipt(lastSale)}>
                <Printer className="h-4 w-4" aria-hidden />
                Imprimir comprobante
              </Button>
            </div>
          )}

          {cart.length === 0 ? (
            <EmptyState title="Carrito vacío" description="Agrega productos desde el catálogo." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {cart.map((line) => (
                <li key={line.product.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{line.product.name}</p>
                    <p className="text-xs text-slate-600">
                      {money(line.product.price)} × {line.quantity} ={' '}
                      {money(Number(line.product.price) * line.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Quitar una unidad de ${line.product.name}`}
                      onClick={() => changeQuantity(line.product.id, -1)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-slate-700">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Agregar una unidad de ${line.product.name}`}
                      onClick={() => changeQuantity(line.product.id, 1)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar ${line.product.name}`}
                      onClick={() => setCart((current) => current.filter((row) => row.product.id !== line.product.id))}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <Field label="Cliente">
              <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">Consumidor final</option>
                {(customers.data?.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Medio de pago">
              <Select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CREDIT">Crédito</option>
              </Select>
            </Field>

            <Field label="Notas">
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>

            <dl className="space-y-1.5 rounded-xl bg-slate-50 px-3.5 py-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>IVA incluido</dt>
                <dd>{money(totals.tax)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-900">
                <dt>Total a cobrar</dt>
                <dd>{money(totals.total)}</dd>
              </div>
            </dl>

            <Button
              className="w-full"
              loading={submit.isPending}
              disabled={cart.length === 0}
              onClick={() => void handleCheckout()}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              Cobrar {money(totals.total)}
            </Button>

            {pending > 0 && (
              <p className="text-center text-xs text-slate-600">
                {pending} venta(s) esperando sincronización
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
