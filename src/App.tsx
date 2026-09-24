import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './lib/auth';
import { CashPage } from './pages/Cash';
import { CustomersPage } from './pages/Customers';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { PosPage } from './pages/Pos';
import { ProductsPage } from './pages/Products';
import { PurchasesPage } from './pages/Purchases';
import { ResetPage } from './pages/Reset';
import { UsersPage } from './pages/Users';

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

  return <Layout />;
}

export function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<LoginPage />} />
      <Route path="/recuperar" element={<ResetPage />} />
      <Route element={<ProtectedArea />}>
        <Route path="/tablero" element={<DashboardPage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/productos" element={<ProductsPage />} />
        <Route path="/compras" element={<PurchasesPage />} />
        <Route path="/caja" element={<CashPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
        <Route path="/clientes" element={<CustomersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/tablero" replace />} />
    </Routes>
  );
}
