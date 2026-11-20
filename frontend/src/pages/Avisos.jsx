import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marcarLeida, marcarTodasLeidas, obtenerNotificaciones, revisarCobros } from '../services/notificacionService';
import { obtenerUsuario } from '../services/authService';
import { mensajeError } from '../services/api';
import Toast from '../components/Toast';

const TIPOS = {
  COBRO_PROXIMO: 'pronto',
  COBRO_HOY: 'hoy',
  COBRO_ATRASADO: 'atrasado',
  AUMENTO: 'aumento',
};

function haceCuanto(fechaISO) {
  const minutos = Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

export default function Avisos() {
  const usuario = obtenerUsuario();
  const [avisos, setAvisos] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setAvisos(await obtenerNotificaciones());
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const marcar = async (aviso) => {
    if (aviso.leida) return;
    setAvisos(avisos.map((a) => (a._id === aviso._id ? { ...a, leida: true } : a)));
    await marcarLeida(aviso._id).catch(() => {});
  };

  const marcarTodas = async () => {
    await marcarTodasLeidas();
    cargarDatos();
  };

  const revisarAhora = async () => {
    try {
      const resultado = await revisarCobros();
      setToast({ mensaje: `Revisión lista: ${resultado.nuevas} avisos nuevos`, id: Date.now() });
      cargarDatos();
    } catch (err) {
      setToast({ mensaje: mensajeError(err), tipo: 'error', id: Date.now() });
    }
  };

  const hayNoLeidas = avisos !== null && avisos.some((a) => !a.leida);

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Avisos</h1>
          <p className="texto-suave">
            Te avisamos {usuario.diasAviso} {usuario.diasAviso === 1 ? 'día' : 'días'} antes de cada cobro.{' '}
            <Link to="/perfil">Cambiar</Link>
          </p>
        </div>
        <div className="acciones acciones--compactas">
          {usuario.rol === 'ADMIN' && <button className="boton" onClick={revisarAhora}>Revisar cobros ahora</button>}
          {hayNoLeidas && <button className="boton" onClick={marcarTodas}>Marcar todo como leído</button>}
        </div>
      </header>

      {error && <p className="mensaje mensaje--error">{error}</p>}
      {!avisos && !error && <div className="esqueleto" aria-busy="true" />}

      {avisos && avisos.length === 0 && (
        <div className="vacio vacio--chico">
          <p>No hay avisos. Cuando se acerque un cobro o aumente un precio, lo vas a ver acá.</p>
        </div>
      )}

      {avisos && avisos.length > 0 && (
        <ul className="avisos">
          {avisos.map((a) => (
            <li key={a._id} className={`aviso aviso--${TIPOS[a.tipo]} ${a.leida ? 'aviso--leido' : ''}`}>
              <button className="aviso__cuerpo" onClick={() => marcar(a)} aria-label={`${a.titulo}. ${a.leida ? 'Leído' : 'Marcar como leído'}`}>
                <span className="aviso__titulo">{a.titulo}</span>
                <span className="aviso__mensaje">{a.mensaje}</span>
              </button>
              <span className="aviso__lateral">
                <span className="texto-suave">{haceCuanto(a.createdAt)}</span>
                {a.suscripcionId && <Link to={`/suscripciones/${a.suscripcionId}`}>Ver</Link>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {toast && <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} alCerrar={() => setToast(null)} />}
    </>
  );
}
