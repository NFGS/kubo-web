import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './lib/auth';
import { PackProvider } from './lib/pack';
import { CashPage } from './pages/Cash';
import { CustomersPage } from './pages/Customers';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { NotificationsPage } from './pages/Notifications';
import { PlatformPage } from './pages/Platform';
import { PosPage } from './pages/Pos';
import { ProductsPage } from './pages/Products';
import { PurchasesPage } from './pages/Purchases';
import { ResetPage } from './pages/Reset';
import { SettingsPage } from './pages/Settings';
import { UsersPage } from './pages/Users';
import { WarehousesPage } from './pages/Warehouses';

function ProtectedArea() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Preparando tu negocio…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/ingresar" replace />;
  }

  return (
    <PackProvider>
      <Layout />
    </PackProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<LoginPage />} />
      <Route path="/recuperar" element={<ResetPage />} />
      <Route path="/plataforma" element={<PlatformPage />} />
      <Route element={<ProtectedArea />}>
        <Route path="/tablero" element={<DashboardPage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/productos" element={<ProductsPage />} />
        <Route path="/compras" element={<PurchasesPage />} />
        <Route path="/caja" element={<CashPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
        <Route path="/clientes" element={<CustomersPage />} />
        <Route path="/configuracion" element={<SettingsPage />} />
        <Route path="/bodegas" element={<WarehousesPage />} />
        <Route path="/notificaciones" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/tablero" replace />} />
    </Routes>
  );
}
