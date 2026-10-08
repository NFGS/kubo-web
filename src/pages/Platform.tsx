import { useState, type FormEvent } from 'react';
import { Building2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, ErrorNote, Field, Input } from '../components/ui';
import { apiBase } from '../lib/api';

/**
 * Panel de plataforma (F6.4, ADR-0025).
 *
 * Reino separado: su token NO es el del negocio (el gateway lo exige y lo
 * aísla), y el acceso siempre pide el código del autenticador. El poder es
 * mínimo: listar negocios, suspender, reactivar y registrar pagos; nunca se leen
 * datos de negocio (ventas, clientes, documentos).
 */

interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  planRenewsAt: string | null;
  activeUsers: number;
  maxUsers: number;
  maxWarehouses: number;
}

interface PendingPayment {
  id: string;
  tenantName: string;
  plan: string;
  cycleMonths: number;
  amount: string;
  currency: string;
  provider: string;
  reference: string;
  createdAt: string;
}

interface TenantUsage {
  tenant_id: string;
  products: number;
  warehouses: number;
  sales_month: { count: number; revenue: string };
  documents: { count: number; bytes: number };
}

interface AuditEntry {
  actorEmail: string;
  action: string;
  tenantId: string | null;
  detail: string | null;
  createdAt: string;
}

// La base del API es dinámica: en web es relativa; en la app móvil apunta al
// servidor del negocio (ADR-0031).

export function PlatformPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('operador@kubo.local');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [usage, setUsage] = useState<Record<string, TenantUsage>>({});
  const [rotation, setRotation] = useState<{ otpauthUri: string; secret: string } | null>(null);

  async function platformFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(`${apiBase()}${path}`, { ...init, headers });
  }

  async function cargar(): Promise<void> {
    const [negocios, auditoria, pagos, uso] = await Promise.all([
      platformFetch('/platform/tenants'),
      platformFetch('/platform/audit?limit=20'),
      platformFetch('/platform/payments'),
      platformFetch('/platform/usage')
    ]);

    if (negocios.ok) {
      setTenants(((await negocios.json()) as PlatformTenant[]) ?? []);
    }
    if (auditoria.ok) {
      setAudit(((await auditoria.json()) as { data: AuditEntry[] }).data ?? []);
    }
    if (pagos.ok) {
      setPayments(((await pagos.json()) as PendingPayment[]) ?? []);
    }
    if (uso.ok) {
      const cuerpo = (await uso.json()) as { data?: TenantUsage[] };
      setUsage(Object.fromEntries((cuerpo.data ?? []).map((fila) => [fila.tenant_id, fila])));
    }
  }

  /**
   * Rota el segundo factor del operador (F6.6): el secreto viejo deja de servir
   * en el acto. La URI nueva se muestra UNA vez; despues no se puede recuperar.
   */
  async function rotarSegundoFactor(): Promise<void> {
    setError(null);
    setRotation(null);
    const response = await platformFetch('/platform/totp/rotate', { method: 'POST' });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setError(body.message ?? 'No fue posible rotar el segundo factor');
      return;
    }

    setRotation((await response.json()) as { otpauthUri: string; secret: string });
  }

  /** Registra el pago de una intencion: extiende el plan por su ciclo (F6.6). */
  async function registrarPago(pago: PendingPayment): Promise<void> {
    setError(null);
    const response = await platformFetch(`/platform/payments/${pago.id}/confirm`, { method: 'POST' });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setError(body.message ?? 'No fue posible registrar el pago');
      return;
    }

    await cargar();
  }

  async function entrar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase()}/platform/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const body = (await response.json()) as { challengeToken?: string; message?: string };

      if (!response.ok) {
        throw new Error(body.message ?? 'No fue posible ingresar');
      }
      setChallenge(body.challengeToken ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible ingresar');
    } finally {
      setLoading(false);
    }
  }

  async function verificar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase()}/platform/auth/totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken: challenge, code: code.trim() })
      });
      const body = (await response.json()) as { accessToken?: string; message?: string };

      if (!response.ok || !body.accessToken) {
        throw new Error(body.message ?? 'El código no es válido');
      }

      setToken(body.accessToken);
      setChallenge(null);
      setCode('');
      setPassword('');
      await cargar();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'El código no es válido');
    } finally {
      setLoading(false);
    }
  }

  async function actualizar(tenant: PlatformTenant, patch: Record<string, unknown>): Promise<void> {
    setError(null);
    const response = await platformFetch(`/platform/tenants/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setError(body.message ?? 'No fue posible actualizar el negocio');
      return;
    }

    await cargar();
  }

  if (!token) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-900 p-6">
        <form onSubmit={challenge ? verificar : entrar} className="card w-full max-w-md space-y-5 p-8">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <ShieldCheck className="h-6 w-6 text-kubo-600" aria-hidden />
              Plataforma Kubo
            </h1>
            <p className="text-sm text-slate-500">
              Acceso de operador: segundo factor obligatorio y auditoría de cada acción.
            </p>
          </div>

          <ErrorNote message={error} />

          {challenge ? (
            <>
              <Field label="Código del autenticador">
                <Input
                  value={code}
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  required
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <Button type="submit" loading={loading} className="w-full">
                Verificar código
              </Button>
              <button
                type="button"
                className="block w-full text-center text-sm font-medium text-kubo-700"
                onClick={() => {
                  setChallenge(null);
                  setCode('');
                  setError(null);
                }}
              >
                Volver
              </button>
            </>
          ) : (
            <>
              <Field label="Correo">
                <Input
                  type="email"
                  value={email}
                  autoComplete="username"
                  required
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field label="Contraseña">
                <Input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  required
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Button type="submit" loading={loading} className="w-full">
                Ingresar
              </Button>
            </>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-5 py-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck className="h-6 w-6 text-kubo-300" aria-hidden />
              Panel de plataforma
            </h1>
            <p className="mt-0.5 text-sm text-mist">
              Negocios, plan y estado. El operador no lee datos de negocio: solo los gestiona.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void cargar();
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Actualizar
          </Button>
        </header>

        <ErrorNote message={error} />

        <Card title="Negocios">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-periwinkle text-left text-xs font-semibold tracking-wider text-ink-800 uppercase [&>th]:px-3 [&>th]:py-2.5">
                  <th className="pb-3">Negocio</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Usuarios</th>
                  <th className="pb-3">Uso</th>
                  <th className="pb-3">Renueva</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rowline [&>tr>td]:px-3">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="flex items-center gap-2 font-medium text-slate-800">
                        <Building2 className="h-4 w-4 text-slate-400" aria-hidden />
                        {tenant.name}
                      </p>
                      <p className="text-xs text-slate-600">{tenant.slug}</p>
                    </td>
                    <td className="py-3 text-slate-700">{tenant.plan}</td>
                    <td className="py-3">
                      {tenant.status === 'ACTIVE' ? (
                        <Badge tone="success">Activo</Badge>
                      ) : (
                        <Badge tone="violet">Suspendido</Badge>
                      )}
                    </td>
                    <td className="py-3 text-slate-700">
                      {tenant.activeUsers} de {tenant.maxUsers}
                    </td>
                    <td className="py-3 text-xs text-slate-600">
                      {usage[tenant.id] ? (
                        <>
                          <p>
                            {usage[tenant.id].products} productos · {usage[tenant.id].warehouses}{' '}
                            bodegas
                          </p>
                          <p>
                            {usage[tenant.id].sales_month.count} ventas del mes ·{' '}
                            {usage[tenant.id].documents.count} documentos
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-600">{tenant.planRenewsAt ?? '—'}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {tenant.status === 'ACTIVE' ? (
                          <Button
                            variant="secondary"
                            onClick={() => void actualizar(tenant, { status: 'SUSPENDED' })}
                          >
                            Suspender
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => void actualizar(tenant, { status: 'ACTIVE' })}
                          >
                            Reactivar
                          </Button>
                        )}
                        <Button onClick={() => void actualizar(tenant, { renewDays: 30 })}>
                          Renovar 30 días
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Pagos por confirmar">
          {payments.length === 0 ? (
            <p className="text-sm text-slate-600">No hay pagos pendientes de confirmar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-periwinkle text-left text-xs font-semibold tracking-wider text-ink-800 uppercase [&>th]:px-3 [&>th]:py-2.5">
                    <th className="pb-3">Negocio</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Monto</th>
                    <th className="pb-3">Referencia</th>
                    <th className="pb-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rowline [&>tr>td]:px-3">
                  {payments.map((pago) => (
                    <tr key={pago.id} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-800">{pago.tenantName}</td>
                      <td className="py-3 text-slate-700">
                        {pago.plan} · {pago.cycleMonths} mes(es)
                      </td>
                      <td className="py-3 text-slate-700">
                        {pago.amount} {pago.currency}
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-600">{pago.reference}</td>
                      <td className="py-3 text-right">
                        <Button onClick={() => void registrarPago(pago)}>Registrar pago</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Seguridad del operador">
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">
              Si pierdes el autenticador, rota el segundo factor: el código viejo deja de servir en
              el acto y la URI nueva se muestra una sola vez.
            </p>
            <Button variant="secondary" onClick={() => void rotarSegundoFactor()}>
              Rotar segundo factor
            </Button>
            {rotation && (
              <div className="space-y-2 rounded-xl bg-amber-50 px-3.5 py-3 text-amber-900">
                <p className="font-medium">Escanéala ahora: no se volverá a mostrar.</p>
                <p className="font-mono text-xs break-all">{rotation.otpauthUri}</p>
                <p className="text-xs">
                  Clave manual: <span className="font-mono">{rotation.secret}</span>
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Auditoría de plataforma">
          <ul className="divide-y divide-slate-100 text-sm">
            {audit.map((entrada, indice) => (
              <li key={`${entrada.createdAt}-${indice}`} className="flex justify-between gap-3 py-2">
                <span className="text-slate-700">
                  <strong>{entrada.action}</strong>
                  {entrada.detail ? ` · ${entrada.detail}` : ''}
                </span>
                <span className="text-xs text-slate-500">
                  {entrada.actorEmail} · {entrada.createdAt.slice(0, 19).replace('T', ' ')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
