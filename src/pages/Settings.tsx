import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, ShieldCheck, Store } from 'lucide-react';
import {
  ApiError,
  apiFetch,
  refreshSession,
  totpDisable,
  totpEnable,
  totpSetup
} from '../lib/api';
import { useToast } from '../components/Toaster';
import { money, number } from '../lib/format';
import type { ApiItem, Pack, Tenant, Usage, User } from '../lib/types';
import { Button, Card, ErrorNote, Field, Input, Select, Spinner } from '../components/ui';

/**
 * Perfil del negocio (P-17, ADR-0012, ADR-0013).
 *
 * El vertical adapta la terminología y los valores por defecto; la zona horaria
 * define el día comercial. Ambos viajan en el token, así que al guardar se
 * refresca la sesión: la interfaz y el ERP usan los valores nuevos sin volver a
 * ingresar.
 */
interface PlanPrice {
  plan: string;
  currency: string;
  cycleMonths: number;
  amount: string;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [vertical, setVertical] = useState('');
  const [timezone, setTimezone] = useState('');

  const tenant = useQuery({
    queryKey: ['tenant'],
    queryFn: () => apiFetch<ApiItem<Tenant>>('/tenants/me')
  });

  const packs = useQuery({
    queryKey: ['packs'],
    queryFn: () => apiFetch<{ data: Pack[] }>('/packs')
  });

  useEffect(() => {
    if (tenant.data) {
      setVertical(tenant.data.data.vertical);
      setTimezone(tenant.data.data.timezone);
    }
  }, [tenant.data]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<ApiItem<Tenant>>('/tenants/me', {
        method: 'PATCH',
        body: JSON.stringify({ vertical, timezone })
      }),
    onSuccess: async () => {
      setError(null);
      await refreshSession();
      await queryClient.invalidateQueries();
      notify('Negocio actualizado', 'success');
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'No fue posible guardar los cambios')
  });

  const seed = useMutation({
    mutationFn: () =>
      apiFetch<{ data: { created: number; skipped: number; pack: string } }>('/packs/apply', {
        method: 'POST'
      }),
    onSuccess: async (response) => {
      notify(
        `Catálogo de arranque: ${response.data.created} creado(s), ${response.data.skipped} ya existían`,
        'success'
      );
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'No fue posible cargar el catálogo')
  });

  const me = useQuery({ queryKey: ['me'], queryFn: () => apiFetch<User>('/auth/me') });
  const prices = useQuery({
    queryKey: ['prices'],
    queryFn: () => apiFetch<{ data: PlanPrice[] }>('/tenants/me/prices')
  });

  /** Pide pagar el plan: la intencion queda pendiente y el operador la confirma. */
  const pagar = useMutation({
    mutationFn: (precio: PlanPrice) =>
      apiFetch<{ reference: string; amount: string; status: string }>('/tenants/me/payments', {
        method: 'POST',
        body: JSON.stringify({ plan: precio.plan, cycle_months: precio.cycleMonths })
      }),
    onSuccess: (respuesta) => {
      setError(null);
      notify(
        `Solicitud registrada (${respuesta.amount}). El operador confirmara el pago; la referencia es ${respuesta.reference}.`,
        'success'
      );
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'No fue posible registrar la solicitud de pago')
  });

  const uso = useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<ApiItem<Usage>>('/usage')
  });
  const [secret, setSecret] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const setup = useMutation({
    mutationFn: totpSetup,
    onSuccess: (data) => {
      setSecret(data);
      notify('Escanea el código con tu aplicación autenticadora', 'info');
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'No fue posible generar el secreto')
  });

  const enable = useMutation({
    mutationFn: () => totpEnable(totpCode.trim()),
    onSuccess: async () => {
      setSecret(null);
      setTotpCode('');
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      notify('Segundo factor activado', 'success');
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'El código no es válido')
  });

  const disable = useMutation({
    mutationFn: () => totpDisable(totpCode.trim()),
    onSuccess: async () => {
      setTotpCode('');
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      notify('Segundo factor desactivado', 'success');
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'El código no es válido')
  });

  const seleccionado = packs.data?.data.find((pack) => pack.key === vertical);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración del negocio</h1>
        <p className="text-sm text-slate-600">
          El vertical adapta la terminología y los valores por defecto; la zona horaria define el día
          comercial.
        </p>
      </header>

      <ErrorNote message={error} />

      <Card title="Uso del plan">
        {uso.isLoading ? (
          <Spinner label="Midiendo el uso…" />
        ) : (
          <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <li className="rounded-xl bg-slate-50 px-3.5 py-3">
              Usuarios activos: <strong>{tenant.data?.data.activeUsers ?? '—'}</strong> de{' '}
              {tenant.data?.data.maxUsers ?? '—'}
            </li>
            <li className="rounded-xl bg-slate-50 px-3.5 py-3">
              Bodegas: <strong>{uso.data?.data.warehouses ?? '—'}</strong> de{' '}
              {tenant.data?.data.maxWarehouses ?? '—'}
            </li>
            <li className="rounded-xl bg-slate-50 px-3.5 py-3">
              {seleccionado?.product_label_plural ?? 'Productos'}:{' '}
              <strong>{number(uso.data?.data.products ?? 0)}</strong>
            </li>
            <li className="rounded-xl bg-slate-50 px-3.5 py-3">
              Ventas de {uso.data?.data.sales_month.month ?? '—'}:{' '}
              <strong>{number(uso.data?.data.sales_month.count ?? 0)}</strong> (
              {money(uso.data?.data.sales_month.revenue ?? 0)})
            </li>
            <li className="rounded-xl bg-slate-50 px-3.5 py-3">
              Documentos: <strong>{number(uso.data?.data.documents.count ?? 0)}</strong> (
              {((uso.data?.data.documents.bytes ?? 0) / 1024).toFixed(1)} KB)
            </li>
            {tenant.data?.data.planRenewsAt && (
              <li className="rounded-xl bg-slate-50 px-3.5 py-3">
                Plan pagado hasta: <strong>{tenant.data.data.planRenewsAt}</strong>
              </li>
            )}
          </ul>
        )}
      </Card>

      <Card title="Pagar el plan">
        {prices.isLoading ? (
          <Spinner label="Consultando precios…" />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Elige un ciclo: la solicitud queda registrada y el operador confirma el pago.
            </p>
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              {(prices.data?.data ?? []).map((precio) => (
                <li
                  key={`${precio.plan}-${precio.cycleMonths}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3"
                >
                  <span className="text-slate-700">
                    <strong>{money(Number(precio.amount))}</strong>{' '}
                    {precio.currency} · {precio.cycleMonths} mes(es)
                  </span>
                  <Button
                    variant="secondary"
                    disabled={pagar.isPending}
                    onClick={() => pagar.mutate(precio)}
                  >
                    Solicitar pago
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="Segundo factor">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <ShieldCheck className="mr-1 inline h-4 w-4 text-kubo-600" aria-hidden />
            Con el segundo factor activo, al ingresar se pide un código de 6 dígitos de tu
            aplicación autenticadora además de la contraseña.
          </p>

          {me.data?.totpEnabled ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Código actual" hint="Necesario para desactivar">
                <Input
                  value={totpCode}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                loading={disable.isPending}
                disabled={totpCode.length !== 6}
                onClick={() => disable.mutate()}
              >
                Desactivar
              </Button>
            </div>
          ) : secret ? (
            <div className="space-y-3">
              <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm break-all text-slate-700">
                Secreto: <strong>{secret.secret}</strong>
                <br />
                URI: <span className="text-xs">{secret.otpauthUri}</span>
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Código del autenticador" hint="Confirma que el secreto quedó bien">
                  <Input
                    value={totpCode}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ''))}
                  />
                </Field>
                <Button
                  type="button"
                  loading={enable.isPending}
                  disabled={totpCode.length !== 6}
                  onClick={() => enable.mutate()}
                >
                  Activar
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" loading={setup.isPending} onClick={() => setup.mutate()}>
              Configurar segundo factor
            </Button>
          )}
        </div>
      </Card>

      {tenant.isLoading || packs.isLoading ? (
        <Spinner label="Cargando configuración…" />
      ) : (
        <Card title="Perfil del negocio">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Vertical" hint="Adapta la terminología de la interfaz y los valores por defecto">
              <Select value={vertical} onChange={(event) => setVertical(event.target.value)}>
                {(packs.data?.data ?? []).map((pack) => (
                  <option key={pack.key} value={pack.key}>
                    {pack.name}
                  </option>
                ))}
              </Select>
            </Field>

            {seleccionado && (
              <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
                <Store className="mr-1 inline h-4 w-4" aria-hidden />
                {seleccionado.description} El catálogo se llama{' '}
                <strong>{seleccionado.product_label_plural}</strong> y el IVA por defecto es{' '}
                {seleccionado.default_tax_rate}%.
              </p>
            )}

            <Field label="Zona horaria" hint="Formato IANA, por ejemplo America/Bogota">
              <Input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="America/Bogota"
              />
            </Field>

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                loading={seed.isPending}
                onClick={() => seed.mutate()}
              >
                <PackagePlus className="h-4 w-4" aria-hidden />
                Cargar catálogo de arranque
              </Button>
              <Button type="submit" loading={save.isPending}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
