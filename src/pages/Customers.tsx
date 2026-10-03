import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ApiError, apiFetch } from '../lib/api';
import { money, number, stageLabels } from '../lib/format';
import { useToast } from '../components/Toaster';
import type { ApiItem, ApiList, Customer, CustomerStage } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, Select, Spinner } from '../components/ui';

interface CustomerForm {
  name: string;
  email: string;
  document_number: string;
  phone: string;
  city: string;
  address: string;
  stage: CustomerStage;
  notes: string;
  credit_limit: string;
}

const emptyForm: CustomerForm = {
  name: '',
  email: '',
  document_number: '',
  phone: '',
  city: '',
  address: '',
  stage: 'LEAD',
  notes: '',
  credit_limit: '0'
};

function toForm(customer: Customer): CustomerForm {
  return {
    name: customer.name,
    email: customer.email ?? '',
    document_number: customer.document_number ?? '',
    phone: customer.phone ?? '',
    city: customer.city ?? '',
    address: customer.address ?? '',
    stage: customer.stage,
    notes: customer.notes ?? '',
    credit_limit: String(customer.credit_limit)
  };
}

const stageTone: Record<CustomerStage, 'info' | 'warning' | 'success'> = {
  LEAD: 'info',
  PROSPECT: 'warning',
  CUSTOMER: 'success'
};

export function CustomersPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [term, setTerm] = useState('');
  const [stage, setStage] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams();
  if (term.trim()) query.set('q', term.trim());
  if (stage) query.set('stage', stage);

  const customers = useQuery({
    queryKey: ['customers', query.toString()],
    queryFn: () => apiFetch<ApiList<Customer>>(`/customers?${query.toString()}`)
  });

  const save = useMutation({
    mutationFn: async (payload: CustomerForm) => {
      const body = JSON.stringify({
        ...payload,
        credit_limit: Number(payload.credit_limit || '0'),
        email: payload.email || null,
        document_number: payload.document_number || null,
        phone: payload.phone || null,
        city: payload.city || null,
        address: payload.address || null,
        notes: payload.notes || null
      });
      if (editing) {
        return apiFetch<ApiItem<Customer>>(`/customers/${editing.id}`, { method: 'PATCH', body });
      }
      return apiFetch<ApiItem<Customer>>('/customers', { method: 'POST', body });
    },
    onSuccess: async () => {
      notify(editing ? 'Cliente actualizado' : 'Cliente creado', 'success');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible guardar el cliente');
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      notify('Cliente archivado', 'success');
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (caught) => {
      notify(caught instanceof ApiError ? caught.message : 'No fue posible archivar', 'error');
    }
  });

  const rows = customers.data?.data ?? [];
  const total = useMemo(() => customers.data?.total ?? 0, [customers.data]);

  function openCreate(): void {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  async function openEdit(customer: Customer): Promise<void> {
    setEditing(customer);
    setForm(toForm(customer));
    setError(null);
    setModalOpen(true);

    // El listado entrega documento y telefono enmascarados: se pide el detalle
    // (que los revela) para editar sobre el valor real y no re-cifrar la mascara.
    try {
      const detalle = await apiFetch<ApiItem<Customer>>(`/customers/${customer.id}`);
      setForm(toForm(detalle.data));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible cargar el cliente');
    }
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
          <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-600">
            {number(total)} registros · el documento y el teléfono se guardan cifrados
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Nuevo cliente
        </Button>
      </header>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-slate-400" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o correo"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>
          <Select
            className="max-w-52"
            aria-label="Filtrar por etapa"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            <option value="">Todas las etapas</option>
            <option value="LEAD">Prospecto nuevo</option>
            <option value="PROSPECT">En negociación</option>
            <option value="CUSTOMER">Cliente</option>
          </Select>
        </div>

        {customers.isLoading ? (
          <Spinner label="Cargando clientes…" />
        ) : customers.isError ? (
          <ErrorNote
            message={customers.error instanceof Error ? customers.error.message : 'Error al cargar'}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aún no hay clientes"
            description="Crea el primer cliente para empezar a construir tu cartera."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Documento</th>
                  <th className="pb-3">Contacto</th>
                  <th className="pb-3">Etapa</th>
                  <th className="pb-3 text-right">Cupo</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{customer.name}</p>
                      <p className="text-xs text-slate-600">{customer.city ?? 'Sin ciudad'}</p>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {customer.document_number ?? '—'}
                    </td>
                    <td className="py-3 text-slate-600">
                      <p>{customer.phone ?? '—'}</p>
                      <p className="text-xs text-slate-600">{customer.email ?? 'sin correo'}</p>
                    </td>
                    <td className="py-3">
                      <Badge tone={stageTone[customer.stage]}>{stageLabels[customer.stage]}</Badge>
                    </td>
                    <td className="py-3 text-right text-slate-700">{money(customer.credit_limit)}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(customer)}
                          aria-label={`Editar ${customer.name}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-kubo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove.mutate(customer.id)}
                          aria-label={`Archivar ${customer.name}`}
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
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${editing.name}` : 'Nuevo cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorNote message={error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre o razón social">
              <Input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Documento (NIT / cédula)" hint="Se guarda cifrado">
              <Input
                value={form.document_number}
                onChange={(event) => setForm({ ...form, document_number: event.target.value })}
              />
            </Field>
            <Field label="Teléfono / WhatsApp" hint="Se guarda cifrado">
              <Input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <Field label="Correo">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Ciudad">
              <Input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </Field>
            <Field label="Dirección">
              <Input
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </Field>
            <Field label="Etapa">
              <Select
                value={form.stage}
                onChange={(event) => setForm({ ...form, stage: event.target.value as CustomerStage })}
              >
                <option value="LEAD">Prospecto nuevo</option>
                <option value="PROSPECT">En negociación</option>
                <option value="CUSTOMER">Cliente</option>
              </Select>
            </Field>
            <Field label="Cupo de crédito">
              <Input
                type="number"
                min={0}
                step={1000}
                value={form.credit_limit}
                onChange={(event) => setForm({ ...form, credit_limit: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Notas">
            <Input
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
