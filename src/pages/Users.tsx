import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { ApiError, apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toaster';
import type { User } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, Select, Spinner } from '../components/ui';

interface PageOfUsers {
  content: User[];
  totalElements: number;
}

interface UserForm {
  fullName: string;
  email: string;
  password: string;
  role: string;
}

const emptyForm: UserForm = { fullName: '', email: '', password: '', role: 'SELLER' };

const ROLES = [
  { value: 'OWNER', label: 'Propietario' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SELLER', label: 'Vendedor' },
  { value: 'ACCOUNTANT', label: 'Contador' },
  { value: 'VIEWER', label: 'Solo consulta' }
];

const roleLabel = (role: string): string => ROLES.find((item) => item.value === role)?.label ?? role;

/**
 * Usuarios y roles (P-20).
 *
 * Solo el propietario o un administrador pueden crear y editar (el API lo
 * verifica; la interfaz oculta las acciones al resto). Un vendedor deshabilitado
 * no puede ingresar.
 */
export function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<PageOfUsers>('/users?size=100')
  });

  const createUser = useMutation({
    mutationFn: (payload: UserForm) =>
      apiFetch<User>('/users', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async () => {
      notify('Usuario creado', 'success');
      setModalOpen(false);
      setForm(emptyForm);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible crear el usuario');
    }
  });

  const updateUser = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, string> }) =>
      apiFetch<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: async () => {
      notify('Usuario actualizado', 'success');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (caught) => {
      notify(caught instanceof ApiError ? caught.message : 'No fue posible actualizar', 'error');
    }
  });

  const rows = users.data?.content ?? [];

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    createUser.mutate(form);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-5 py-4">
        <div>
          <h1 className="text-lg font-bold text-white">Usuarios y roles</h1>
          <p className="mt-0.5 text-sm text-mist">
            Crea vendedores y administradores, cambia su rol o deshabilita su acceso.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setForm(emptyForm);
              setError(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo usuario
          </Button>
        )}
      </header>

      {!canManage && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <ShieldCheck className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          Tu rol es <strong>{roleLabel(currentUser?.role ?? '')}</strong>: puedes consultar el equipo,
          pero solo el propietario o un administrador pueden gestionarlo.
        </div>
      )}

      <Card>
        {users.isLoading ? (
          <Spinner label="Cargando usuarios…" />
        ) : rows.length === 0 ? (
          <EmptyState title="Sin usuarios" description="Crea el primer vendedor del negocio." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-periwinkle text-left text-xs font-semibold tracking-wider text-ink-800 uppercase [&>th]:px-3 [&>th]:py-2.5">
                  <th className="pb-3">Usuario</th>
                  <th className="pb-3">Rol</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rowline [&>tr>td]:px-3">
                {rows.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-medium text-slate-800">
                        {user.fullName}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs font-normal text-slate-600">(tú)</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-600">{user.email}</p>
                    </td>
                    <td className="py-3">
                      {canManage && user.id !== currentUser?.id ? (
                        <Select
                          className="max-w-44"
                          aria-label={`Rol de ${user.fullName}`}
                          value={user.role}
                          onChange={(event) =>
                            updateUser.mutate({ id: user.id, patch: { role: event.target.value } })
                          }
                        >
                          {ROLES.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-slate-700">{roleLabel(user.role)}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {user.status === 'DISABLED' ? (
                        <Badge tone="warning">Deshabilitado</Badge>
                      ) : (
                        <Badge tone="success">Activo</Badge>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end">
                        {canManage && user.id !== currentUser?.id && (
                          <button
                            type="button"
                            aria-label={
                              user.status === 'DISABLED'
                                ? `Habilitar a ${user.fullName}`
                                : `Deshabilitar a ${user.fullName}`
                            }
                            onClick={() =>
                              updateUser.mutate({
                                id: user.id,
                                patch: { status: user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED' }
                              })
                            }
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-kubo-600"
                          >
                            {user.status === 'DISABLED' ? (
                              <UserRoundCheck className="h-4 w-4" />
                            ) : (
                              <UserRoundX className="h-4 w-4" />
                            )}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo usuario">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorNote message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo">
              <Input
                required
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </Field>
            <Field label="Correo">
              <Input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Contraseña" hint="Mínimo 8 caracteres">
              <Input
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </Field>
            <Field label="Rol">
              <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createUser.isPending}>
              Crear usuario
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
