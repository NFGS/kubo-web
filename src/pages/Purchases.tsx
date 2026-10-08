import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Truck, Undo2 } from 'lucide-react';
import { ApiError, apiFetch } from '../lib/api';
import { dateTime, money, number } from '../lib/format';
import { useToast } from '../components/Toaster';
import type { ApiItem, ApiList, Product, Purchase, Supplier, Warehouse } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, Select, Spinner } from '../components/ui';

interface SupplierForm {
  name: string;
  tax_id: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
}

const emptySupplier: SupplierForm = {
  name: '',
  tax_id: '',
  contact_name: '',
  phone: '',
  email: '',
  address: ''
};

interface PurchaseLine {
  product_id: string;
  quantity: string;
  unit_cost: string;
}

const emptyLine: PurchaseLine = { product_id: '', quantity: '1', unit_cost: '' };

/**
 * Compras y proveedores (P-15).
 *
 * Cierra el ciclo del inventario: la mercancia entra por una compra con su
 * proveedor y su costo, no por un ajuste manual. Cada linea suma stock en la
 * bodega elegida, deja el kardex y actualiza el costo del producto con el valor
 * sin IVA.
 */
export function PurchasesPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [supplierModal, setSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplier);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([{ ...emptyLine }]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiFetch<ApiList<Supplier>>('/suppliers?limit=200')
  });

  const products = useQuery({
    queryKey: ['products', 'for-purchases'],
    queryFn: () => apiFetch<ApiList<Product>>('/products?limit=200')
  });

  const warehouses = useQuery({
    queryKey: ['warehouses', 'purchases'],
    queryFn: () => apiFetch<{ data: Warehouse[] }>('/warehouses')
  });

  const bodegas = useMemo(() => {
    const lista = warehouses.data?.data ?? [];
    const porDefecto = lista.find((warehouse) => warehouse.is_default);
    // La bodega por defecto va primera y preseleccionada (P-22).
    return porDefecto ? [porDefecto, ...lista.filter((row) => !row.is_default)] : lista;
  }, [warehouses.data]);

  useEffect(() => {
    if (!warehouseId && bodegas.length > 0) {
      setWarehouseId(bodegas[0].id);
    }
  }, [bodegas, warehouseId]);

  const purchases = useQuery({
    queryKey: ['purchases'],
    queryFn: () => apiFetch<ApiList<Purchase>>('/purchases?limit=50')
  });

  const saveSupplier = useMutation({
    mutationFn: (payload: SupplierForm) =>
      apiFetch<ApiItem<Supplier>>('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          tax_id: payload.tax_id || null,
          contact_name: payload.contact_name || null,
          phone: payload.phone || null,
          email: payload.email || null,
          address: payload.address || null
        })
      }),
    onSuccess: async (response) => {
      notify('Proveedor creado', 'success');
      setSupplierModal(false);
      setSupplierForm(emptySupplier);
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSupplierId(response.data.id);
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible guardar el proveedor');
    }
  });

  const createPurchase = useMutation({
    mutationFn: () =>
      apiFetch<ApiItem<Purchase>>('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: supplierId,
          warehouse_id: warehouseId || null,
          notes: notes || null,
          items: lines
            .filter((line) => line.product_id)
            .map((line) => ({
              product_id: line.product_id,
              quantity: Number(line.quantity || '1'),
              unit_cost: Number(line.unit_cost || '0')
            }))
        })
      }),
    onSuccess: async () => {
      notify('Compra registrada: el inventario y el costo se actualizaron', 'success');
      setPurchaseModal(false);
      setLines([{ ...emptyLine }]);
      setNotes('');
      setWarehouseId('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['purchases'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible registrar la compra');
    }
  });

  const voidPurchase = useMutation({
    mutationFn: (id: string) => apiFetch<ApiItem<Purchase>>(`/purchases/${id}/void`, { method: 'POST' }),
    onSuccess: async () => {
      notify('Compra anulada: el inventario volvio a su estado anterior', 'success');
      await queryClient.invalidateQueries({ queryKey: ['purchases'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (caught) => {
      notify(caught instanceof ApiError ? caught.message : 'No fue posible anular la compra', 'error');
    }
  });

  const supplierRows = suppliers.data?.data ?? [];
  const productRows = products.data?.data ?? [];
  const purchaseRows = purchases.data?.data ?? [];

  function updateLine(index: number, patch: Partial<PurchaseLine>): void {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  }

  function handleSupplierSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    saveSupplier.mutate(supplierForm);
  }

  function handlePurchaseSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    createPurchase.mutate();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-5 py-4">
        <div>
          <h1 className="text-lg font-bold text-white">Compras y proveedores</h1>
          <p className="mt-0.5 text-sm text-mist">
            {number(purchaseRows.length)} compra(s) · {number(supplierRows.length)} proveedor(es). Cada
            compra suma inventario y actualiza el costo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setSupplierModal(true)}>
            <Truck className="h-4 w-4" aria-hidden />
            Nuevo proveedor
          </Button>
          <Button onClick={() => setPurchaseModal(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Registrar compra
          </Button>
        </div>
      </header>

      <Card>
        <h2 className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Proveedores</h2>
        {suppliers.isLoading ? (
          <Spinner label="Cargando proveedores…" />
        ) : supplierRows.length === 0 ? (
          <EmptyState
            title="Sin proveedores"
            description="Crea tu primer proveedor para registrar compras de mercancía."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-periwinkle text-left text-xs font-semibold tracking-wider text-ink-800 uppercase [&>th]:px-3 [&>th]:py-2.5">
                  <th className="pb-3">Proveedor</th>
                  <th className="pb-3">NIT</th>
                  <th className="pb-3">Teléfono</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rowline [&>tr>td]:px-3">
                {supplierRows.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{supplier.name}</p>
                      <p className="text-xs text-slate-600">{supplier.contact_name ?? supplier.email ?? '—'}</p>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">{supplier.tax_id ?? '—'}</td>
                    <td className="py-3 text-slate-600">{supplier.phone ?? '—'}</td>
                    <td className="py-3">
                      {supplier.active ? <Badge tone="success">Activo</Badge> : <Badge tone="warning">Inactivo</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Compras</h2>
        {purchases.isLoading ? (
          <Spinner label="Cargando compras…" />
        ) : purchaseRows.length === 0 ? (
          <EmptyState
            title="Sin compras"
            description="Registra una compra para sumar inventario con su costo real."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-periwinkle text-left text-xs font-semibold tracking-wider text-ink-800 uppercase [&>th]:px-3 [&>th]:py-2.5">
                  <th className="pb-3">Compra</th>
                  <th className="pb-3">Proveedor</th>
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rowline [&>tr>td]:px-3">
                {purchaseRows.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{purchase.number}</p>
                      <p className="text-xs text-slate-600">{number(purchase.items.length)} línea(s)</p>
                    </td>
                    <td className="py-3 text-slate-600">{purchase.supplier_name}</td>
                    <td className="py-3 text-slate-500">{dateTime(purchase.received_at)}</td>
                    <td className="py-3 text-right text-slate-700">{money(purchase.total)}</td>
                    <td className="py-3">
                      {purchase.status === 'RECEIVED' ? (
                        <Badge tone="success">Recibida</Badge>
                      ) : (
                        <Badge tone="warning">Anulada</Badge>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end">
                        {purchase.status === 'RECEIVED' && (
                          <button
                            type="button"
                            onClick={() => voidPurchase.mutate(purchase.id)}
                            aria-label={`Anular la compra ${purchase.number}`}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          >
                            <Undo2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={supplierModal} onClose={() => setSupplierModal(false)} title="Nuevo proveedor">
        <form onSubmit={handleSupplierSubmit} className="space-y-4">
          <ErrorNote message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <Input
                required
                value={supplierForm.name}
                onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })}
              />
            </Field>
            <Field label="NIT o documento">
              <Input
                value={supplierForm.tax_id}
                onChange={(event) => setSupplierForm({ ...supplierForm, tax_id: event.target.value })}
              />
            </Field>
            <Field label="Contacto">
              <Input
                value={supplierForm.contact_name}
                onChange={(event) => setSupplierForm({ ...supplierForm, contact_name: event.target.value })}
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={supplierForm.phone}
                onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })}
              />
            </Field>
            <Field label="Correo">
              <Input
                type="email"
                value={supplierForm.email}
                onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })}
              />
            </Field>
            <Field label="Dirección">
              <Input
                value={supplierForm.address}
                onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSupplierModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saveSupplier.isPending}>
              Crear proveedor
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={purchaseModal} onClose={() => setPurchaseModal(false)} title="Registrar compra">
        <form onSubmit={handlePurchaseSubmit} className="space-y-4">
          <ErrorNote message={error} />

          <Field label="Proveedor">
            <Select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">Selecciona un proveedor…</option>
              {supplierRows.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Bodega de entrada">
            <Select
              required
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
            >
              <option value="">Selecciona una bodega…</option>
              {bodegas.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Líneas</p>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_2.5rem]">
                <Select
                  required
                  aria-label={`Producto de la línea ${index + 1}`}
                  value={line.product_id}
                  onChange={(event) => {
                    const product = productRows.find((candidate) => candidate.id === event.target.value);
                    updateLine(index, {
                      product_id: event.target.value,
                      unit_cost: product?.cost ?? line.unit_cost
                    });
                  }}
                >
                  <option value="">Producto…</option>
                  {productRows.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  required
                  aria-label={`Cantidad de la línea ${index + 1}`}
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  step={100}
                  required
                  aria-label={`Costo unitario de la línea ${index + 1}`}
                  placeholder="Costo c/IVA"
                  value={line.unit_cost}
                  onChange={(event) => updateLine(index, { unit_cost: event.target.value })}
                />
                <button
                  type="button"
                  aria-label={`Quitar la línea ${index + 1}`}
                  onClick={() => setLines((current) => current.filter((_line, position) => position !== index))}
                  disabled={lines.length === 1}
                  className="grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLines((current) => [...current, { ...emptyLine }])}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Agregar línea
            </Button>
          </div>

          <Field label="Notas">
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPurchaseModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createPurchase.isPending} disabled={!supplierId}>
              Registrar compra
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
