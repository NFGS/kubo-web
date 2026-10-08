import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, requestPasswordReset, resetPassword } from '../lib/api';
import { Button, ErrorNote, Field, Input } from '../components/ui';

/**
 * Recuperacion de contrasena (P-04).
 *
 * Sin `?token` en la URL pide el correo y envia el enlace; con `?token` pide la
 * contrasena nueva. El enlace vence en minutos y solo puede usarse una vez.
 */
export function ResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRequest(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setDone(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token ?? '', password);
      setDone(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card w-full max-w-md space-y-5 p-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">
            {token ? 'Elige tu nueva contraseña' : 'Recupera tu acceso'}
          </h2>
          <p className="text-sm text-slate-600">
            {token
              ? 'El enlace es de un solo uso y vence en minutos.'
              : 'Te enviaremos un enlace al correo registrado.'}
          </p>
        </div>

        <ErrorNote message={error} />

        {done ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-green-50 px-3.5 py-3 text-sm text-green-800">
              {token
                ? 'Contraseña actualizada. Ya puedes ingresar con ella.'
                : 'Si el correo está registrado, recibirás el enlace en unos minutos.'}
            </p>
            <Link to="/ingresar" className="block text-center text-sm font-medium text-kubo-700">
              Volver al ingreso
            </Link>
          </div>
        ) : token ? (
          <form onSubmit={handleReset} className="space-y-5">
            <Field label="Nueva contraseña">
              <Input
                type="password"
                value={password}
                autoComplete="new-password"
                minLength={8}
                required
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field label="Repite la contraseña">
              <Input
                type="password"
                value={confirm}
                autoComplete="new-password"
                minLength={8}
                required
                onChange={(event) => setConfirm(event.target.value)}
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              Cambiar contraseña
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="space-y-5">
            <Field label="Correo">
              <Input
                type="email"
                value={email}
                autoComplete="username"
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              Enviar enlace
            </Button>
            <Link to="/ingresar" className="block text-center text-sm font-medium text-kubo-700">
              Volver al ingreso
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
