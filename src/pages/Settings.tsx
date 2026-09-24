import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, Store } from 'lucide-react';
import { ApiError, apiFetch, refreshSession } from '../lib/api';
import { useToast } from '../components/Toaster';
import type { ApiItem, Pack, Tenant } from '../lib/types';
import { Button, Card, ErrorNote, Field, Input, Select, Spinner } from '../components/ui';

/**
 * Perfil del negocio (P-17, ADR-0012, ADR-0013).
 *
 * El vertical adapta la terminología y los valores por defecto; la zona horaria
 * define el día comercial. Ambos viajan en el token, así que al guardar se
 * refresca la sesión: la interfaz y el ERP usan los valores nuevos sin volver a
 * ingresar.
 */
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
