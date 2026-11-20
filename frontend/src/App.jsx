import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DatosProvider } from './context/DatosContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Acceso from './pages/Acceso';
import Panel from './pages/Panel';
import Suscripciones from './pages/Suscripciones';
import DetalleSuscripcion from './pages/DetalleSuscripcion';
import Avisos from './pages/Avisos';
import Asesor from './pages/Asesor';
import Perfil from './pages/Perfil';
import Categorias from './pages/Categorias';
import Proveedores from './pages/Proveedores';
import Grupos from './pages/Grupos';
import DetalleGrupo from './pages/DetalleGrupo';

export default function App() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <div className="pantalla-carga" aria-busy="true">Cargando…</div>;
  }

  return (
    <Routes>
      <Route path="/ingresar" element={usuario ? <Navigate to="/" replace /> : <Acceso modo="login" />} />
      <Route path="/registro" element={usuario ? <Navigate to="/" replace /> : <Acceso modo="registro" />} />

      {/* Todo lo de adentro exige haber iniciado sesión */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DatosProvider><Layout /></DatosProvider>}>
          <Route index element={<Panel />} />
          <Route path="suscripciones" element={<Suscripciones />} />
          <Route path="suscripciones/:id" element={<DetalleSuscripcion />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="grupos" element={<Grupos />} />
          <Route path="grupos/:id" element={<DetalleGrupo />} />
          <Route path="avisos" element={<Avisos />} />
          <Route path="asesor" element={<Asesor />} />
          <Route path="perfil" element={<Perfil />} />
          <Route element={<ProtectedRoute soloAdmin />}>
            <Route path="categorias" element={<Categorias />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
