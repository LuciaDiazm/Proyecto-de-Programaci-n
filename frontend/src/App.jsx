import { Navigate, Route, Routes } from 'react-router-dom';
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
import Etiquetas from './pages/Etiquetas';

// Módulo 5: el mapa de navegación de la app
export default function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<Acceso modo="login" />} />
      <Route path="/registro" element={<Acceso modo="registro" />} />

      {/* Todas las rutas de adentro requieren haber iniciado sesión */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Panel />} />
          <Route path="suscripciones" element={<Suscripciones />} />
          <Route path="suscripciones/:id" element={<DetalleSuscripcion />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="grupos" element={<Grupos />} />
          <Route path="grupos/:id" element={<DetalleGrupo />} />
          <Route path="avisos" element={<Avisos />} />
          <Route path="asesor" element={<Asesor />} />
          <Route path="etiquetas" element={<Etiquetas />} />
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
