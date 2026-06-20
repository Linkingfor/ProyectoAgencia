import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import ComercialLayout from './comercial/ComercialLayout';
import Home            from './comercial/Home';
import Catalogo        from './comercial/Catalogo';


import IntranetLogin from './pages/Login';
import Layout        from './components/Layout/Layout';
import Dashboard     from './pages/Dashboard';
import Clientes      from './pages/Clientes';
import { Paquetes, Trabajadores } from './pages/AllPages';
import { Reservas, Salidas, Transporte, Pagos } from './pages/Operaciones';

function Cargando() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Cargando...</p>
    </div>
  );
}


function RequireTrabajador({ children }) {
  const { esTrabajador, loading } = useAuth();
  if (loading) return <Cargando />;
  return esTrabajador ? children : <Navigate to="/admin/login" replace />;
}

function AppRoutes() {
  const { esCliente, esTrabajador, loading } = useAuth();
  if (loading) return <Cargando />;

  return (
    <Routes>
      <Route element={<ComercialLayout />}>
        <Route index path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalogo />} />
      
      </Route>

      <Route path="/admin/login" element={esTrabajador ? <Navigate to="/admin" replace /> : <IntranetLogin />} />
      <Route path="/admin" element={<RequireTrabajador><Layout /></RequireTrabajador>}>
        <Route index element={<Dashboard />} />
        <Route path="reservas"     element={<Reservas />} />
        <Route path="salidas"      element={<Salidas />} />
        <Route path="pagos"        element={<Pagos />} />
        <Route path="paquetes"     element={<Paquetes />} />
        <Route path="transporte"   element={<Transporte />} />
        <Route path="clientes"     element={<Clientes />} />
        <Route path="trabajadores" element={<Trabajadores />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
