import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { formatearMonto } from '../utils/formato';
import {
  IconoCampana,
  IconoChispa,
  IconoEdificio,
  IconoEtiqueta,
  IconoGrupo,
  IconoLista,
  IconoPanel,
  IconoSalir,
  IconoUsuario,
} from './Iconos';

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const { noLeidas, dolarTarjeta } = useDatos();

  const enlaces = [
    { a: '/', texto: 'Este mes', Icono: IconoPanel, fin: true },
    { a: '/suscripciones', texto: 'Suscripciones', Icono: IconoLista },
    { a: '/proveedores', texto: 'Proveedores', Icono: IconoEdificio },
    { a: '/grupos', texto: 'Grupos', Icono: IconoGrupo },
    { a: '/avisos', texto: 'Avisos', Icono: IconoCampana, contador: noLeidas },
    { a: '/asesor', texto: 'Asesor IA', Icono: IconoChispa },
    { a: '/perfil', texto: 'Perfil', Icono: IconoUsuario },
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
          {enlaces.map(({ a, texto, Icono, fin, contador }) => (
            <NavLink key={a} to={a} end={fin} className="nav__enlace">
              <Icono />
              <span className="nav__texto">{texto}</span>
              {contador > 0 && (
                <span className="nav__contador" aria-label={`${contador} sin leer`}>
                  {contador > 9 ? '9+' : contador}
                </span>
              )}
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
              {usuario.nombre?.[0]?.toUpperCase()}
            </span>
            <span className="usuario__nombre">{usuario.nombre}</span>
            <button className="boton-icono" onClick={() => cerrarSesion()} aria-label="Cerrar sesión" title="Cerrar sesión">
              <IconoSalir />
            </button>
          </div>
        </div>
      </aside>

      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
