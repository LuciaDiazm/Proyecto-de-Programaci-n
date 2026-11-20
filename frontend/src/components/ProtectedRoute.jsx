import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Módulo 5: las rutas hijas solo se muestran con sesión iniciada
export default function ProtectedRoute({ soloAdmin = false }) {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to="/ingresar" replace />;
  if (soloAdmin && usuario.rol !== 'ADMIN') return <Navigate to="/" replace />;

  return <Outlet />;
}
