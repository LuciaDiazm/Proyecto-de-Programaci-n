import { Navigate, Outlet } from 'react-router-dom';
import { obtenerUsuario } from '../services/authService';

// Módulo 5: si no hay token, se vuelve al login.
// Con soloAdmin, además se revisa el rol guardado al iniciar sesión.
export default function ProtectedRoute({ soloAdmin = false }) {
  const token = localStorage.getItem('token');
  const usuario = obtenerUsuario();

  if (!token || !usuario) return <Navigate to="/ingresar" replace />;
  if (soloAdmin && usuario.rol !== 'ADMIN') return <Navigate to="/" replace />;

  return <Outlet />;
}
