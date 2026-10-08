import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useState } from 'react';
import { CloudOff, Coins, Download, Package, Receipt, TrendingUp, Users } from 'lucide-react';
import { apiFetch, downloadFile } from '../lib/api';
import { compactMoney, dateTime, money, number, paymentLabels, shortDate } from '../lib/format';
import { useQueue } from '../lib/queue';
import { useToast } from '../components/Toaster';
import type { OverviewResponse } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Spinner } from '../components/ui';

// Donut pastel de la referencia: menta, azul, rosa, ambar y violeta claros.
const PIE_COLORS = ['#a7f3d0', '#93c5fd', '#f9a8d4', '#fcd34d', '#c4b5fd'];

interface TooltipEntry {
  value?: number | string;
}

function ChartTooltip({
  active,
  payload,
  label,
  isMoney = true
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  isMoney?: boolean;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-xl border border-edge bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="font-semibold text-slate-700">{shortDate(String(label))}</p>}
      <p className="text-slate-500">{isMoney ? money(value) : `${number(value)} unidades`}</p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'info'
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  hint?: string;
  tone?: 'info' | 'success' | 'warning';
}) {
  const toneClasses = {
    info: 'bg-kubo-100 text-kubo-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700'
  } as const;

  return (
    <Card className="flex items-start gap-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-600">{hint}</p>}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { online } = useQueue();
  const { notify } = useToast();
  const [exporting, setExporting] = useState(false);

  async function exportSales() {
    setExporting(true);
    try {
      await downloadFile('/reports/sales.csv', 'ventas.csv');
      notify('Reporte de ventas descargado', 'success');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'No fue posible exportar las ventas', 'error');
    } finally {
      setExporting(false);
    }
  }

  // Una sola peticion: el gateway compone la vista consultando los servicios
  // en paralelo. Antes eran siete viajes de red secuenciales.
  const overview = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => apiFetch<OverviewResponse>('/dashboard/overview'),
    refetchInterval: 60_000
  });

  const data = overview.data?.data;
  const unavailable = overview.data?.unavailable ?? [];

  const summary = data?.summary;
  const salesSeries = data?.sales_by_day ?? [];
  const products = data?.top_products ?? [];
  const paymentRows = data?.payment_methods ?? [];
  const recentSales = data?.recent_sales ?? [];
  const rotationRows = data?.rotation ?? [];
  const customerStats = data?.customers;

  // Centro del donut (referencia visual): cuota del medio de pago dominante.
  const totalPagos = paymentRows.reduce((suma, fila) => suma + Number(fila.revenue), 0);
  const pagoTop =
    paymentRows.length > 0
      ? paymentRows.reduce(
          (top, fila) => (Number(fila.revenue) > Number(top.revenue) ? fila : top),
          paymentRows[0]
        )
      : null;
  const cuotaTop =
    pagoTop && totalPagos > 0 ? Math.round((Number(pagoTop.revenue) / totalPagos) * 100) : 0;

  if (overview.isLoading) {
    return <Spinner label="Cargando el tablero…" />;
  }

  if (overview.isError) {
    return (
      <ErrorNote
        message={
          overview.error instanceof Error
            ? overview.error.message
            : 'No fue posible cargar los indicadores'
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-5 py-4">
        <div>
          <h1 className="text-lg font-bold text-white">Tablero del negocio</h1>
          <p className="mt-0.5 text-sm text-mist">
            Indicadores construidos a partir de los eventos de venta, en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <Badge tone="warning">
              <span className="inline-flex items-center gap-1">
                <CloudOff className="h-3.5 w-3.5" aria-hidden /> Mostrando datos guardados
              </span>
            </Badge>
          )}
          {unavailable.length > 0 && <Badge tone="danger">Vistas sin datos: {unavailable.length}</Badge>}
          <Button variant="secondary" loading={exporting} onClick={exportSales}>
            <Download className="h-4 w-4" aria-hidden />
            Exportar ventas
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={TrendingUp}
          label="Ventas de hoy"
          value={money(summary?.today.revenue ?? 0)}
          hint={`${number(summary?.today.sales_count ?? 0)} transacciones`}
          tone="success"
        />
        <Kpi
          icon={Receipt}
          label="Ingreso acumulado"
          value={money(summary?.revenue ?? 0)}
          hint={`${number(summary?.sales_count ?? 0)} ventas registradas`}
        />
        <Kpi
          icon={Coins}
          label="Ticket promedio"
          value={money(summary?.avg_ticket ?? 0)}
          hint={`IVA recaudado ${money(summary?.tax ?? 0)}`}
        />
        <Kpi
          icon={Package}
          label="Unidades vendidas"
          value={number(summary?.units_sold ?? 0)}
          hint={`${number(summary?.customers_count ?? 0)} clientes atendidos`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Ventas de los últimos 14 días" className="xl:col-span-2">
          {salesSeries.length === 0 ? (
            <EmptyState
              title="Todavía no hay ventas registradas"
              description="Registra una venta en el POS y aparecerá aquí en segundos."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesSeries}>
                  <defs>
                    {/* Barra azul de la referencia: degradado vertical claro -> royal. */}
                    <linearGradient id="kuboBarraAzul" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => shortDate(value)}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(value: number) => compactMoney(value)}
                    stroke="#64748b"
                    fontSize={12}
                    width={70}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="revenue"
                    fill="url(#kuboBarraAzul)"
                    radius={[6, 6, 0, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Medios de pago">
          {paymentRows.length === 0 ? (
            <EmptyState title="Sin datos de pago" />
          ) : (
            <>
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentRows}
                      dataKey="revenue"
                      nameKey="payment_method"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {paymentRows.map((row, index) => (
                        <Cell key={row.payment_method} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {pagoTop && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-ink-900">{cuotaTop}%</span>
                    <span className="max-w-16 truncate text-[10px] font-medium text-slate-500">
                      {paymentLabels[pagoTop.payment_method] ?? pagoTop.payment_method}
                    </span>
                  </div>
                )}
              </div>
              <ul className="mt-2 space-y-2 text-sm">
                {paymentRows.map((row, index) => (
                  <li key={row.payment_method} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      {paymentLabels[row.payment_method] ?? row.payment_method}
                    </span>
                    <span className="font-semibold text-slate-800">{money(row.revenue)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Productos más vendidos">
          {products.length === 0 ? (
            <EmptyState title="Sin productos vendidos" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={products} layout="vertical" margin={{ left: 12, right: 24 }}>
                  <defs>
                    {/* Serie verde de la referencia: degradado claro -> pleno. */}
                    <linearGradient id="kuboBarraVerde" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#86efac" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    tickFormatter={(value: number) => compactMoney(value)}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis
                    type="category"
                    dataKey="product_name"
                    stroke="#64748b"
                    fontSize={12}
                    width={140}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" fill="url(#kuboBarraVerde)" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Últimas ventas">
          {recentSales.length === 0 ? (
            <EmptyState title="Sin ventas registradas" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-periwinkle text-left text-xs font-semibold tracking-wider text-ink-800 uppercase [&>th]:px-3 [&>th]:py-2.5">
                    <th className="pb-2">Número</th>
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rowline [&>tr>td]:px-3">
                  {recentSales.map((sale) => (
                    <tr key={sale.sale_id}>
                      <td className="py-2.5 font-medium text-slate-700">{sale.number}</td>
                      <td className="py-2.5 text-slate-600">{sale.customer_name ?? 'Consumidor final'}</td>
                      <td className="py-2.5 text-slate-500">{dateTime(sale.sold_at)}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-800">
                        {money(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Rotación de 7 días">
          {rotationRows.length === 0 ? (
            <EmptyState title="Sin movimientos" />
          ) : (
            <ul className="space-y-2.5 text-sm">
              {rotationRows.map((row) => (
                <li key={row.product_name} className="flex items-center justify-between">
                  <span className="truncate text-slate-600">{row.product_name}</span>
                  <Badge tone="info">{number(row.quantity_7d)} u.</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Cartera de clientes">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <Users className="h-4 w-4 text-slate-400" aria-hidden /> Total de clientes
              </span>
              <span className="text-lg font-semibold text-slate-900">
                {number(customerStats?.total ?? 0)}
              </span>
            </div>
            {Object.entries(customerStats?.by_stage ?? {}).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-slate-500">
                  {stage === 'LEAD'
                    ? 'Prospectos nuevos'
                    : stage === 'PROSPECT'
                      ? 'En negociación'
                      : 'Clientes activos'}
                </span>
                <span className="font-semibold text-slate-700">{number(count)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-500">Nuevos esta semana</span>
              <span className="font-semibold text-slate-700">
                {number(customerStats?.created_last_7_days ?? 0)}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Cómo leer este tablero">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              Cada venta del POS se publica como un evento y este tablero se actualiza sin que
              tengas que recargar ni exportar nada.
            </li>
            <li>
              El día comercial se calcula en la zona horaria del negocio: una venta de las 20:00
              cuenta en el día de hoy, no en el siguiente.
            </li>
            <li>
              Si el local se queda sin internet, el POS sigue vendiendo y el tablero muestra lo
              último sincronizado.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
