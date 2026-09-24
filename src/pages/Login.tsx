import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BarChart3, PackageCheck, ShieldCheck, WifiOff } from 'lucide-react';
import { ApiError, login } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, ErrorNote, Field, Input } from '../components/ui';

const highlights = [
  { icon: BarChart3, text: 'Tablero con las ventas del día en tiempo real' },
  { icon: PackageCheck, text: 'Inventario, kardex y alertas de stock bajo' },
  { icon: WifiOff, text: 'Funciona sin internet y sincroniza al reconectar' },
  { icon: ShieldCheck, text: 'Datos cifrados y auditados en tu propio servidor' }
];

export function LoginPage() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState('admin@kubo.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/tablero" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await login(email.trim(), password);
      signIn(session.user);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No fue posible conectar con el servidor'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink-900 p-12 text-slate-300 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-kubo-600 text-xl font-bold text-white">
            K
          </span>
          <div>
            <p className="text-lg font-semibold text-white">Kubo</p>
            <p className="text-xs text-slate-400">ERP + CRM para PYMES</p>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <h1 className="text-3xl font-semibold text-white">
            Digitaliza tu negocio sin pagar suscripciones
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Kubo se instala en el local, en un computador pequeño o en un servidor económico.
            Tus datos son tuyos: clientes, inventario y ventas siempre bajo tu control.
          </p>
          <ul className="space-y-3">
            {highlights.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-kubo-300" aria-hidden />
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          Armenia, Quindío · Software autoalojable con licencia MIT
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-5 p-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-900">Ingresa a tu negocio</h2>
            <p className="text-sm text-slate-500">Usa la cuenta del administrador o del vendedor.</p>
          </div>

          <ErrorNote message={error} />

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

          <Link to="/recuperar" className="block text-center text-sm font-medium text-kubo-700">
            ¿Olvidaste tu contraseña?
          </Link>

          <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
            Demo: <strong>admin@kubo.local</strong> / <strong>Admin123!</strong> — también hay un
            usuario vendedor con menos permisos.
          </p>
        </form>
      </section>
    </div>
  );
}
