import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout, obtenerUsuario } from '../services/authService';
import { obtenerDolarTarjeta } from '../services/cotizacionService';
import { obtenerNoLeidas } from '../services/notificacionService';
import { conectarNotificaciones } from '../services/socket';
import { formatearMonto } from '../utils/formato';
import Toast from './Toast';
import {
  IconoCampana,
  IconoChispa,
  IconoEdificio,
  IconoEtiqueta,
  IconoGrupo,
  IconoLista,
  IconoPanel,
  IconoSalir,
} from './Iconos';

export default function Layout() {
  const usuario = obtenerUsuario();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [noLeidas, setNoLeidas] = useState(0);
  const [dolarTarjeta, setDolarTarjeta] = useState(null);
  const [toast, setToast] = useState(null);

  const actualizarContador = () => {
    obtenerNoLeidas().then(setNoLeidas).catch(() => {});
  };

  useEffect(() => {
    obtenerDolarTarjeta().then(setDolarTarjeta).catch(() => setDolarTarjeta(null));
  }, []);

  // Módulo 4: Socket.IO avisa al instante cuando llega una notificación nueva
  useEffect(() => {
    const desconectar = conectarNotificaciones({
      alConectar: actualizarContador,
      alRecibir: (notificacion) => {
        setNoLeidas((actual) => actual + 1);
        setToast({ mensaje: notificacion.titulo, id: Date.now() });
      },
    });
    return desconectar;
  }, []);

  // Al cambiar de pantalla se actualiza el contador (por ejemplo, después de leer avisos)
  useEffect(() => {
    actualizarContador();
  }, [pathname]);

  const cerrarSesion = () => {
    logout();
    navigate('/ingresar');
  };

  const enlaces = [
    { a: '/', texto: 'Este mes', Icono: IconoPanel, fin: true },
    { a: '/suscripciones', texto: 'Suscripciones', Icono: IconoLista },
    { a: '/proveedores', texto: 'Proveedores', Icono: IconoEdificio },
    { a: '/grupos', texto: 'Grupos', Icono: IconoGrupo },
    { a: '/etiquetas', texto: 'Etiquetas', Icono: IconoEtiqueta },
  ];
  if (usuario.rol === 'ADMIN') {
    enlaces.push({ a: '/categorias', texto: 'Categorías', Icono: IconoEtiqueta });
  }

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <img src="/icono.svg" alt="" width="32" height="32" />
          <span>Al Día</span>
        </div>

        <nav className="nav" aria-label="Principal">
          {enlaces.map(({ a, texto, Icono, fin }) => (
            <NavLink key={a} to={a} end={fin} className="nav__enlace">
              <Icono />
              <span className="nav__texto">{texto}</span>
            </NavLink>
          ))}
        </nav>

        <div className="lateral__pie">
          <p className="dolar" title="Dólar tarjeta (incluye impuestos), fuente dolarapi.com">
            Dólar tarjeta{' '}
            <strong>{dolarTarjeta ? formatearMonto(dolarTarjeta, 'ARS') : 'sin datos'}</strong>
          </p>
          <div className="usuario">
            <span className="usuario__avatar" aria-hidden="true">
              {usuario.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="usuario__nombre">{usuario.nombre}</span>
            <button className="boton-icono" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
              <IconoSalir />
            </button>
          </div>
        </div>
      </aside>

      <div className="principal">
        {/* Accesos rápidos arriba a la derecha: avisos, asesor y perfil */}
        <header className="barra-superior">
          <div className="marca barra-superior__marca">
            <img src="/icono.svg" alt="" width="28" height="28" />
            <span>Al Día</span>
          </div>
          <NavLink to="/asesor" className="acceso-rapido">
            <IconoChispa />
            <span>Asesor IA</span>
          </NavLink>
          <NavLink
            to="/avisos"
            className="acceso-rapido acceso-rapido--icono"
            aria-label={noLeidas > 0 ? `Avisos, ${noLeidas} sin leer` : 'Avisos'}
            title="Avisos"
          >
            <IconoCampana />
            {noLeidas > 0 && <span className="acceso-rapido__contador">{noLeidas > 9 ? '9+' : noLeidas}</span>}
          </NavLink>
          <NavLink to="/perfil" className="acceso-rapido acceso-rapido--icono" aria-label="Perfil" title="Perfil">
            <span className="usuario__avatar">{usuario.nombre.charAt(0).toUpperCase()}</span>
          </NavLink>
        </header>

        <main className="contenido">
          <Outlet />
        </main>
      </div>

      {toast && <Toast key={toast.id} mensaje={toast.mensaje} alCerrar={() => setToast(null)} />}
    </div>
  );
}
