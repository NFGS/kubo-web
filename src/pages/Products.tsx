import { useMemo, useState, type FormEvent } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Boxes,
  Download,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload
} from 'lucide-react';
import { ApiError, apiFetch, downloadCsv } from '../lib/api';
import { money, number } from '../lib/format';
import { useToast } from '../components/Toaster';
import { usePack } from '../lib/pack';
import type { ApiItem, ApiList, Product } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, Select, Spinner } from '../components/ui';

interface ProductForm {
  sku: string;
  name: string;
  description: string;
  unit: string;
  price: string;
  cost: string;
  tax_rate: string;
  min_stock: string;
  tracks_stock: boolean;
  active: boolean;
}

const emptyForm: ProductForm = {
  sku: '',
  name: '',
  description: '',
  unit: 'UN',
  price: '',
  cost: '0',
  tax_rate: '19',
  min_stock: '0',
  tracks_stock: true,
  active: true
};

interface StockForm {
  kind: 'IN' | 'OUT' | 'ADJUST';
  quantity: string;
  reason: string;
}

const emptyStock: StockForm = { kind: 'IN', quantity: '1', reason: '' };

export function ProductsPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [term, setTerm] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const pack = usePack();
  const [modalOpen, setModalOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState<StockForm>(emptyStock);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: { line: number; message: string }[];
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  async function exportInventory() {
    setExporting(true);
    try {
      await downloadCsv('/reports/inventory.csv', 'inventario.csv');
      notify('Inventario exportado', 'success');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'No fue posible exportar el inventario', 'error');
    } finally {
      setExporting(false);
    }
  }

  const query = new URLSearchParams();
  if (term.trim()) query.set('q', term.trim());
  if (onlyLow) query.set('low_stock', 'true');

  // Paginacion real (P-13): el servidor devuelve el total y la interfaz pide
  // paginas de 50. Un catalogo de barrio cabe en una pagina; uno grande se
  // recorre con "Cargar mas" sin traer la tabla completa de una vez.
  const products = useInfiniteQuery({
    queryKey: ['products', query.toString()],
    queryFn: ({ pageParam }) =>
      apiFetch<ApiList<Product>>(`/products?${query.toString()}&limit=50&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = (lastPage.offset ?? 0) + lastPage.data.length;
      return loaded < lastPage.total ? loaded : undefined;
    }
  });

  const stats = useQuery({
    queryKey: ['products', 'stats'],
    queryFn: () =>
      apiFetch<ApiItem<{ total: number; active: number; low_stock: number; inventory_value: string }>>(
        '/products/stats'
      )
  });

  const save = useMutation({
    mutationFn: async (payload: ProductForm) => {
      const body = JSON.stringify({
        ...payload,
        description: payload.description || null,
        price: Number(payload.price || '0'),
        cost: Number(payload.cost || '0'),
        tax_rate: Number(payload.tax_rate || '0'),
        min_stock: payload.tracks_stock ? Number(payload.min_stock || '0') : 0
      });
      if (editing) {
        return apiFetch<ApiItem<Product>>(`/products/${editing.id}`, { method: 'PATCH', body });
      }
      return apiFetch<ApiItem<Product>>('/products', { method: 'POST', body });
    },
    onSuccess: async () => {
      notify(editing ? 'Producto actualizado' : 'Producto creado', 'success');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible guardar el producto');
    }
  });

  const adjustStock = useMutation({
    mutationFn: async (payload: StockForm) => {
      if (!stockTarget) {
        throw new Error('Producto no seleccionado');
      }
      return apiFetch<ApiItem<{ product: Product }>>(`/products/${stockTarget.id}/stock`, {
        method: 'POST',
        body: JSON.stringify({
          kind: payload.kind,
          quantity: Number(payload.quantity || '0'),
          reason: payload.reason || 'Ajuste manual'
        })
      });
    },
    onSuccess: async () => {
      notify('Inventario actualizado', 'success');
      setStockTarget(null);
      setStockForm(emptyStock);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (caught) => {
      notify(caught instanceof ApiError ? caught.message : 'No fue posible ajustar el stock', 'error');
    }
  });

  const importProducts = useMutation({
    mutationFn: () =>
      apiFetch<{ data: { created: number; updated: number; errors: { line: number; message: string }[] } }>(
        '/products/import',
        { method: 'POST', body: JSON.stringify({ csv: csvText }) }
      ),
    onSuccess: async (response) => {
      setImportResult(response.data);
      notify(
        `Importación: ${response.data.created} creado(s), ${response.data.updated} actualizado(s)`,
        response.data.errors.length === 0 ? 'success' : 'error'
      );
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible importar el archivo');
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      notify('Producto archivado', 'success');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (caught) => {
      notify(caught instanceof ApiError ? caught.message : 'No fue posible archivar', 'error');
    }
  });

  const rows = products.data?.pages.flatMap((page) => page.data) ?? [];
  const catalogTotal = products.data?.pages[0]?.total ?? 0;
  const summary = stats.data?.data;
  const lowStockCount = useMemo(() => summary?.low_stock ?? 0, [summary]);

  function openCreate(): void {
    setEditing(null);
    // El paquete del negocio propone el valor (P-17): en servicios el catalogo
    // nace sin inventario y el usuario puede cambiarlo.
    setForm({ ...emptyForm, tracks_stock: pack.tracks_stock });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(product: Product): void {
    setEditing(product);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      unit: product.unit,
      price: product.price,
      cost: product.cost,
      tax_rate: product.tax_rate,
      min_stock: String(product.min_stock),
      tracks_stock: product.tracks_stock,
      active: product.active
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    save.mutate(form);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Productos e inventario</h1>
          <p className="text-sm text-slate-600">
            {number(summary?.total ?? 0)} productos · valor del inventario{' '}
            {money(summary?.inventory_value ?? 0)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" loading={exporting} onClick={exportInventory}>
            <Download className="h-4 w-4" aria-hidden />
            Exportar CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setCsvText('');
              setImportResult(null);
              setError(null);
              setImportOpen(true);
            }}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Importar CSV
          </Button>
          <Button onClick={openCreate}>
            <PackagePlus className="h-4 w-4" aria-hidden />
            Nuevo producto
          </Button>
        </div>
      </header>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <span>
            <strong>{number(lowStockCount)}</strong> producto(s) están en o por debajo del stock
            mínimo. Revisa la lista y programa una compra.
          </span>
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-slate-400" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o SKU"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={onlyLow}
              onChange={(event) => setOnlyLow(event.target.checked)}
            />
            Solo stock bajo
          </label>
        </div>

        {products.isLoading ? (
          <Spinner label="Cargando catálogo…" />
        ) : products.isError ? (
          <ErrorNote
            message={products.error instanceof Error ? products.error.message : 'Error al cargar'}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Sin productos"
            description="Crea tu primer producto para poder vender en el POS."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="pb-3">Producto</th>
                  <th className="pb-3">SKU</th>
                  <th className="pb-3 text-right">Precio</th>
                  <th className="pb-3 text-right">IVA</th>
                  <th className="pb-3 text-right">Stock</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-600">
                        {product.unit} · mínimo {number(product.min_stock)}
                      </p>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">{product.sku}</td>
                    <td className="py-3 text-right text-slate-700">{money(product.price)}</td>
                    <td className="py-3 text-right text-slate-500">{product.tax_rate}%</td>
                    <td className="py-3 text-right">
                      {product.low_stock ? (
                        <Badge tone="warning">{number(product.stock)} u.</Badge>
                      ) : (
                        <Badge tone="success">{number(product.stock)} u.</Badge>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setStockTarget(product);
                            setStockForm(emptyStock);
                          }}
                          aria-label={`Ajustar inventario de ${product.name}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-kubo-600"
                        >
                          <Boxes className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.name}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-kubo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove.mutate(product.id)}
                          aria-label={`Archivar ${product.name}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.hasNextPage && (
              <div className="flex items-center justify-between gap-3 pt-4">
                <p className="text-xs text-slate-500">
                  Mostrando {number(rows.length)} de {number(catalogTotal)}
                </p>
                <Button
                  variant="secondary"
                  loading={products.isFetchingNextPage}
                  onClick={() => void products.fetchNextPage()}
                >
                  Cargar más
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${editing.name}` : 'Nuevo producto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorNote message={error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" hint="Código interno o de barras">
              <Input
                required
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
              />
            </Field>
            <Field label="Nombre">
              <Input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Precio de venta" hint="Precio final con IVA incluido">
              <Input
                required
                type="number"
                min={0}
                step={100}
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
              />
            </Field>
            <Field label="Costo">
              <Input
                type="number"
                min={0}
                step={100}
                value={form.cost}
                onChange={(event) => setForm({ ...form, cost: event.target.value })}
              />
            </Field>
            <Field label="Tarifa de IVA (%)">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.tax_rate}
                onChange={(event) => setForm({ ...form, tax_rate: event.target.value })}
              />
            </Field>
            <Field label="Unidad">
              <Input
                value={form.unit}
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
              />
            </Field>
            <Field label="Inventario" hint="Un servicio no descuenta existencias (P-17)">
              <Select
                value={form.tracks_stock ? 'true' : 'false'}
                onChange={(event) => setForm({ ...form, tracks_stock: event.target.value === 'true' })}
              >
                <option value="true">Lleva inventario</option>
                <option value="false">No lleva inventario (servicio)</option>
              </Select>
            </Field>
            {form.tracks_stock && (
              <Field label="Stock mínimo" hint="Dispara la alerta de reposición">
                <Input
                  type="number"
                  min={0}
                  value={form.min_stock}
                  onChange={(event) => setForm({ ...form, min_stock: event.target.value })}
                />
              </Field>
            )}
            <Field label="Estado">
              <Select
                value={form.active ? 'true' : 'false'}
                onChange={(event) => setForm({ ...form, active: event.target.value === 'true' })}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </Select>
            </Field>
          </div>

          <Field label="Descripción">
            <Input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar catálogo (CSV)">
        <div className="space-y-4">
          <ErrorNote message={error} />

          <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
            Columnas: <code>sku</code>, <code>nombre</code>, <code>precio</code>, <code>costo</code>,{' '}
            <code>stock</code>, <code>stock_minimo</code>, <code>iva</code>. Si el SKU ya existe se
            actualiza; el stock entra por el kardex. Excel puede exportar CSV (también se acepta punto
            y coma).
          </p>

          <Field label="Archivo CSV">
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Archivo CSV"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setCsvText(await file.text());
                }
              }}
              className="block w-full text-sm text-slate-600"
            />
          </Field>

          <Field label="Contenido" hint="También puedes pegar el texto directamente">
            <textarea
              rows={6}
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              placeholder={'sku,nombre,precio,costo,stock\n7702001,Chocolate 100 g,4500,3000,20'}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-kubo-500 focus:ring-2 focus:ring-kubo-100 focus:outline-none"
            />
          </Field>

          {importResult && (
            <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
              <p>
                <strong>{importResult.created}</strong> creado(s) · <strong>{importResult.updated}</strong>{' '}
                actualizado(s)
                {importResult.errors.length > 0 ? ` · ${importResult.errors.length} con error` : ''}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-rose-700">
                  {importResult.errors.slice(0, 8).map((item) => (
                    <li key={item.line}>
                      línea {item.line}: {item.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setImportOpen(false)}>
              Cerrar
            </Button>
            <Button
              type="button"
              loading={importProducts.isPending}
              disabled={csvText.trim() === ''}
              onClick={() => importProducts.mutate()}
            >
              Importar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={stockTarget !== null}
        onClose={() => setStockTarget(null)}
        title={`Inventario de ${stockTarget?.name ?? ''}`}
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
            Stock actual: <strong>{number(stockTarget?.stock ?? 0)}</strong> unidades. Cada
            movimiento queda registrado en el kardex con fecha, usuario y motivo.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de movimiento">
              <Select
                value={stockForm.kind}
                onChange={(event) =>
                  setStockForm({ ...stockForm, kind: event.target.value as StockForm['kind'] })
                }
              >
                <option value="IN">Entrada (compra)</option>
                <option value="OUT">Salida (merma, consumo)</option>
                <option value="ADJUST">Fijar stock exacto</option>
              </Select>
            </Field>
            <Field label="Cantidad">
              <Input
                type="number"
                min={1}
                value={stockForm.quantity}
                onChange={(event) => setStockForm({ ...stockForm, quantity: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Motivo">
            <Input
              value={stockForm.reason}
              placeholder="Compra a proveedor, conteo físico, daño…"
              onChange={(event) => setStockForm({ ...stockForm, reason: event.target.value })}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setStockTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={adjustStock.isPending}
              onClick={() => adjustStock.mutate(stockForm)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Aplicar movimiento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
