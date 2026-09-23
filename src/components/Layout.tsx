import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  CloudOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  ShoppingCart,
  Users,
  Wifi
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useQueue } from '../lib/queue';
import { Badge, Button } from './ui';

const navigation = [
  { to: '/tablero', label: 'Tablero', icon: LayoutDashboard },
  { to: '/pos', label: 'Vender', icon: ShoppingCart },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/clientes', label: 'Clientes', icon: Users }
];

export function Layout() {
  const { user, signOut } = useAuth();
  const { pending, syncing, online, flush } = useQueue();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut(): Promise<void> {
    await signOut();
    navigate('/ingresar', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-ink-900 px-4 py-6 text-slate-300 transition-transform lg:static lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-kubo-600 text-lg font-bold text-white">
            K
          </span>
          <div>
            <p className="text-base font-semibold text-white">Kubo</p>
            <p className="text-xs text-slate-400">ERP + CRM</p>
          </div>
        </div>

        <nav className="space-y-1" aria-label="Navegación principal">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-kubo-600 text-white' : 'hover:bg-white/5 hover:text-white'
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-4 bottom-6 space-y-3">
          <div className="rounded-xl bg-white/5 p-3 text-xs">
            <p className="font-semibold text-white">{user?.tenantName ?? 'Mi negocio'}</p>
            <p className="mt-0.5 truncate text-slate-400">{user?.email}</p>
            <p className="mt-1 text-slate-500">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              {online ? (
                <Badge tone="success">
                  <span className="mr-1 inline-flex items-center gap-1">
                    <Wifi className="h-3.5 w-3.5" aria-hidden /> En línea
                  </span>
                </Badge>
              ) : (
                <Badge tone="warning">
                  <span className="mr-1 inline-flex items-center gap-1">
                    <CloudOff className="h-3.5 w-3.5" aria-hidden /> Sin internet
                  </span>
                </Badge>
              )}
              {pending > 0 && <Badge tone="info">{pending} venta(s) por sincronizar</Badge>}
            </div>
          </div>

          {pending > 0 && (
            <Button variant="secondary" loading={syncing} onClick={() => void flush()}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Sincronizar
            </Button>
          )}
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
