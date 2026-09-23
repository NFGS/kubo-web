import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
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
import { CloudOff, Coins, Package, Receipt, TrendingUp, Users } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { compactMoney, dateTime, money, number, paymentLabels, shortDate } from '../lib/format';
import { useQueue } from '../lib/queue';
import type {
  ApiItem,
  DashboardSummary,
  PaymentMethodRow,
  RecentSale,
  RotationRow,
  SalesByDay,
  TopProduct
} from '../lib/types';
import { Badge, Card, EmptyState, ErrorNote, Spinner } from '../components/ui';

const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

interface TooltipEntry {
  value?: number | string;
  name?: string | number;
  dataKey?: string | number;
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
  const first = payload[0];
  const value = Number(first?.value ?? 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
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
    success: 'bg-emerald-100 text-emerald-700',
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
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { online } = useQueue();

  const summary = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiFetch<ApiItem<DashboardSummary>>('/dashboard/summary')
  });
  const byDay = useQuery({
    queryKey: ['dashboard', 'by-day'],
    queryFn: () => apiFetch<ApiItem<SalesByDay[]>>('/dashboard/sales-by-day?days=14')
  });
  const topProducts = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: () => apiFetch<ApiItem<TopProduct[]>>('/dashboard/top-products?limit=8')
  });
  const payments = useQuery({
    queryKey: ['dashboard', 'payments'],
    queryFn: () => apiFetch<ApiItem<PaymentMethodRow[]>>('/dashboard/payment-methods')
  });
  const recent = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: () => apiFetch<ApiItem<RecentSale[]>>('/dashboard/recent-sales?limit=8')
  });
  const rotation = useQuery({
    queryKey: ['dashboard', 'rotation'],
    queryFn: () => apiFetch<ApiItem<RotationRow[]>>('/dashboard/rotation')
  });
  const customers = useQuery({
    queryKey: ['customers', 'stats'],
    queryFn: () => apiFetch<ApiItem<{ total: number; by_stage: Record<string, number> }>>('/customers/stats')
  });

  const data = summary.data?.data;
  const salesSeries = byDay.data?.data ?? [];
  const products = topProducts.data?.data ?? [];
  const paymentRows = payments.data?.data ?? [];
  const recentSales = recent.data?.data ?? [];
  const rotationRows = rotation.data?.data ?? [];

  if (summary.isLoading) {
    return <Spinner label="Cargando el tablero…" />;
  }

  if (summary.isError) {
    return (
      <ErrorNote
        message={
          summary.error instanceof Error
            ? summary.error.message
            : 'No fue posible cargar los indicadores'
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tablero del negocio</h1>
          <p className="text-sm text-slate-500">
            Indicadores construidos a partir de los eventos de venta, en tiempo real.
          </p>
        </div>
        {!online && <Badge tone="warning"><span className="inline-flex items-center gap-1"><CloudOff className="h-3.5 w-3.5" aria-hidden /> Mostrando datos guardados</span></Badge>}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={TrendingUp}
          label="Ventas de hoy"
          value={money(data?.today.revenue ?? 0)}
          hint={`${number(data?.today.sales_count ?? 0)} transacciones`}
          tone="success"
        />
        <Kpi
          icon={Receipt}
          label="Ingreso acumulado"
          value={money(data?.revenue ?? 0)}
          hint={`${number(data?.sales_count ?? 0)} ventas registradas`}
        />
        <Kpi
          icon={Coins}
          label="Ticket promedio"
          value={money(data?.avg_ticket ?? 0)}
          hint={`IVA recaudado ${money(data?.tax ?? 0)}`}
        />
        <Kpi
          icon={Package}
          label="Unidades vendidas"
          value={number(data?.units_sold ?? 0)}
          hint={`${number(data?.customers_count ?? 0)} clientes atendidos`}
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
                <AreaChart data={salesSeries}>
                  <defs>
                    <linearGradient id="kuboRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => shortDate(value)}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(value: number) => compactMoney(value)}
                    stroke="#94a3b8"
                    fontSize={12}
                    width={70}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fill="url(#kuboRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Medios de pago">
          {paymentRows.length === 0 ? (
            <EmptyState title="Sin datos de pago" />
          ) : (
            <>
              <div className="h-52">
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
                  <XAxis
                    type="number"
                    tickFormatter={(value: number) => compactMoney(value)}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <YAxis
                    type="category"
                    dataKey="product_name"
                    stroke="#94a3b8"
                    fontSize={12}
                    width={140}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" fill="#0ea5e9" radius={[0, 8, 8, 0]} barSize={18} />
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
                  <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                    <th className="pb-2">Número</th>
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
          {customers.isLoading ? (
            <Spinner label="Cargando clientes…" />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" aria-hidden /> Total de clientes
                </span>
                <span className="text-lg font-semibold text-slate-900">
                  {number(customers.data?.data.total ?? 0)}
                </span>
              </div>
              {Object.entries(customers.data?.data.by_stage ?? {}).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-slate-500">
                    {stage === 'LEAD' ? 'Prospectos nuevos' : stage === 'PROSPECT' ? 'En negociación' : 'Clientes activos'}
                  </span>
                  <span className="font-semibold text-slate-700">{number(count)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Cómo leer este tablero">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              Cada venta del POS se publica como un evento y este tablero se actualiza sin que
              tengas que recargar ni exportar nada.
            </li>
            <li>
              El ingreso acumulado usa el precio final con IVA incluido; el impuesto se muestra
              aparte para tu contabilidad.
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
