import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconoVolver } from '../components/Iconos';
import { useDatos } from '../context/DatosContext';
import { obtenerTokenVigente, WS_URL } from '../services/api';
import { grupoService } from '../services/grupoService';
import { suscripcionService } from '../services/suscripcionService';
import { conectarProyecto } from '../services/tiempoReal';
import { formatearMonto } from '../utils/formato';

const TEXTOS_EVENTO = {
  suscripcion_creada: 'Se agregó una suscripción',
  suscripcion_actualizada: 'Se modificó una suscripción',
  pago_registrado: 'Se registró un pago',
  miembro_agregado: 'Entró un miembro nuevo',
};

const TEXTOS_CONEXION = {
  conectando: 'Conectando…',
  conectado: 'En vivo',
  reconectando: 'Reconectando…',
};

export default function DetalleGrupo() {
  const { id } = useParams();
  const { mostrarToast } = useDatos();
  const [grupo, setGrupo] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [suscripciones, setSuscripciones] = useState([]);
  const [enLinea, setEnLinea] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [conexion, setConexion] = useState('conectando');
  const [formData, setFormData] = useState({ usuario: '', rol: 'miembro' });
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [datosGrupo, datosResumen, lista] = await Promise.all([
        grupoService.obtener(id),
        grupoService.resumen(id),
        suscripcionService.deGrupo(id),
      ]);
      setGrupo(datosGrupo);
      setResumen(datosResumen);
      setSuscripciones(lista);
      setError('');
    } catch (err) {
      setError(err.status === 404 ? 'Este grupo no existe o no sos miembro.' : err.message);
    }
  }, [id]);

  useEffect(() => {
    cargar();

    const conexionWs = conectarProyecto({
      url: `${WS_URL}/ws/grupos/${id}/`,
      obtenerToken: obtenerTokenVigente,
      alCambiarEstado: setConexion,
      alReconectar: cargar, // Resincroniza por REST lo que se perdió durante el corte
      alRecibir: (mensaje) => {
        if (mensaje.event === 'presencia') {
          setEnLinea((actual) =>
            mensaje.status === 'online'
              ? [...new Set([...actual, mensaje.user])]
              : actual.filter((nombre) => nombre !== mensaje.user)
          );
          return;
        }
        if (TEXTOS_EVENTO[mensaje.event]) {
          setActividad((actual) =>
            [{ id: crypto.randomUUID(), texto: TEXTOS_EVENTO[mensaje.event] }, ...actual].slice(0, 8)
          );
          cargar();
        }
      },
    });

    return () => conexionWs.cerrar();
  }, [id, cargar]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAgregar = async (e) => {
    e.preventDefault();
    try {
      const miembro = await grupoService.agregarMiembro(id, formData);
      setFormData({ usuario: '', rol: 'miembro' });
      mostrarToast(`${miembro.alias} ahora es parte del grupo`);
      cargar();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  if (error) {
    return (
      <div className="vacio vacio--chico">
        <p>{error}</p>
        <Link to="/grupos" className="boton">Volver a grupos</Link>
      </div>
    );
  }
  if (!grupo || !resumen) return <div className="esqueleto" aria-busy="true" />;

  return (
    <>
      <Link to="/grupos" className="volver"><IconoVolver /> Grupos</Link>

      <header className="encabezado">
        <div>
          <h1>{grupo.nombre}</h1>
          {grupo.descripcion && <p className="texto-suave">{grupo.descripcion}</p>}
        </div>
        <span className={`conexion conexion--${conexion}`} role="status">{TEXTOS_CONEXION[conexion]}</span>
      </header>

      <dl className="datos">
        <div><dt>Activas</dt><dd>{resumen.activa}</dd></div>
        <div><dt>En pausa</dt><dd>{resumen.pausada}</dd></div>
        <div><dt>Por mes en pesos</dt><dd>{formatearMonto(resumen.mensual.ARS, 'ARS')}</dd></div>
        <div><dt>Por mes en dólares</dt><dd>{formatearMonto(resumen.mensual.USD, 'USD')}</dd></div>
      </dl>

      <div className="grilla">
        <section className="bloque">
          <div className="bloque__cabecera"><h2>Suscripciones del grupo</h2></div>
          {suscripciones.length ? (
            <ul className="pagos">
              {suscripciones.map((s) => (
                <li key={s.id}>
                  <Link to={`/suscripciones/${s.id}`}>{s.nombre}</Link>
                  <span className="pagos__monto">{formatearMonto(s.monto, s.moneda)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-suave">
              {grupo.mi_rol === 'admin'
                ? 'Al crear una suscripción elegí este grupo para compartirla.'
                : 'Todavía no hay suscripciones compartidas.'}
            </p>
          )}

          {actividad.length > 0 && (
            <>
              <h3 className="subtitulo">Actividad reciente</h3>
              <ul className="actividad" aria-live="polite">
                {actividad.map((a) => <li key={a.id}>{a.texto}</li>)}
              </ul>
            </>
          )}
        </section>

        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Miembros</h2>
            <span className="texto-suave">{grupo.membresias.length}</span>
          </div>
          <ul className="miembros">
            {grupo.membresias.map((m) => (
              <li key={m.id}>
                <span className={`punto ${enLinea.includes(m.alias) ? 'punto--activo' : ''}`} aria-hidden="true" />
                <span>{m.alias}{enLinea.includes(m.alias) && <small className="texto-suave"> en línea</small>}</span>
                <span className="texto-suave">{m.rol}</span>
              </li>
            ))}
          </ul>

          {grupo.mi_rol === 'admin' && (
            <form className="formulario" onSubmit={handleAgregar}>
              <label className="campo">
                <span>Agregar por email</span>
                <input name="usuario" value={formData.usuario} onChange={handleChange} required />
              </label>
              <label className="campo">
                <span>Rol</span>
                <select name="rol" value={formData.rol} onChange={handleChange}>
                  <option value="miembro">Miembro</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button className="boton">Agregar</button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
