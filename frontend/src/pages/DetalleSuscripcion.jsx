import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerHistorial } from '../services/historialService';
import {
  actualizarSuscripcion,
  cancelarSuscripcion,
  obtenerPagosDeSuscripcion,
  obtenerSuscripcion,
} from '../services/suscripcionService';
import { mensajeError } from '../services/api';
import FormSuscripcion from '../components/FormSuscripcion';
import ConfirmarPago from '../components/ConfirmarPago';
import Modal from '../components/Modal';
import Punto from '../components/Punto';
import Toast from '../components/Toast';
import { IconoVolver } from '../components/Iconos';
import {
  colorDeCategoria,
  describirDias,
  ESTADOS,
  formatearFecha,
  formatearMonto,
  nombreDeCategoria,
  textoFrecuencia,
} from '../utils/formato';

// Arma la lista de precios: cada cambio registrado en el historial de Node.
// Si el primer registro es un cambio, se agrega el precio anterior como punto de partida.
function armarPrecios(historial, suscripcion) {
  const enMismaMoneda = historial.filter((h) => h.moneda === suscripcion.moneda);
  const precios = enMismaMoneda.map((h) => ({ fecha: h.createdAt.slice(0, 10), precio: h.precioNuevo }));
  const primero = enMismaMoneda[0];
  if (primero && primero.tipo === 'CAMBIO' && primero.precioAnterior !== null && primero.monedaAnterior === suscripcion.moneda) {
    precios.unshift({ fecha: suscripcion.fecha_inicio, precio: primero.precioAnterior });
  }
  return precios;
}

export default function DetalleSuscripcion() {
  const { id } = useParams();
  const [suscripcion, setSuscripcion] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // 'editar' | 'pagar' | 'cancelar'
  const [toast, setToast] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    try {
      const [datos, listaPagos] = await Promise.all([obtenerSuscripcion(id), obtenerPagosDeSuscripcion(id)]);
      setSuscripcion(datos);
      setPagos(listaPagos);
      setError('');
    } catch (err) {
      const noExiste = err.response && err.response.status === 404;
      setError(noExiste ? 'Esta suscripción no existe o no es tuya.' : mensajeError(err));
    }
    // El historial vive en la otra API: si falla, la página igual se muestra
    obtenerHistorial(id).then(setHistorial).catch(() => setHistorial([]));
  };

  const mostrarToast = (mensaje, tipo = 'ok') => setToast({ mensaje, tipo, id: Date.now() });

  const cambiarEstado = async (estado, mensaje) => {
    try {
      await actualizarSuscripcion(id, { estado });
      mostrarToast(mensaje);
      cargarDatos();
    } catch (err) {
      mostrarToast(mensajeError(err), 'error');
    }
  };

  const cancelar = async () => {
    try {
      await cancelarSuscripcion(id);
      mostrarToast('Suscripción cancelada');
      setModal(null);
      cargarDatos();
    } catch (err) {
      mostrarToast(mensajeError(err), 'error');
    }
  };

  if (error) {
    return (
      <div className="vacio vacio--chico">
        <p>{error}</p>
        <Link to="/suscripciones" className="boton">Volver a suscripciones</Link>
      </div>
    );
  }
  if (!suscripcion) return <div className="esqueleto" aria-busy="true" />;

  const s = suscripcion;
  const precios = armarPrecios(historial, s);
  const primerPrecio = precios.length ? precios[0].precio : null;
  const aumentoTotal = primerPrecio ? ((s.monto - primerPrecio) / primerPrecio) * 100 : null;

  return (
    <>
      <Link to="/suscripciones" className="volver"><IconoVolver /> Suscripciones</Link>

      <header className="detalle">
        <div>
          <p className="detalle__categoria">
            <Punto color={colorDeCategoria(s)} /> {nombreDeCategoria(s)}
          </p>
          <h1>{s.nombre}</h1>
          <p className="detalle__precio">
            {formatearMonto(s.monto, s.moneda)} <span>{textoFrecuencia(s).toLowerCase()}</span>
          </p>
          {s.descripcion && <p className="texto-suave">{s.descripcion}</p>}
        </div>
        <span className={`estado estado--${s.estado}`}>{ESTADOS[s.estado]}</span>
      </header>

      {/* El servidor también lo verifica: en un grupo solo editan los admins */}
      {s.puede_editar && <div className="acciones">
        {s.estado === 'activa' && (
          <>
            <button className="boton boton--primario" onClick={() => setModal('pagar')}>Registrar pago</button>
            <button className="boton" onClick={() => setModal('editar')}>Editar</button>
            <button className="boton" onClick={() => cambiarEstado('pausada', 'Suscripción en pausa')}>Pausar</button>
            <button className="boton boton--peligro" onClick={() => setModal('cancelar')}>Cancelar suscripción</button>
          </>
        )}
        {s.estado === 'pausada' && (
          <>
            <button className="boton boton--primario" onClick={() => cambiarEstado('activa', 'Suscripción reactivada')}>Reactivar</button>
            <button className="boton" onClick={() => setModal('editar')}>Editar</button>
            <button className="boton boton--peligro" onClick={() => setModal('cancelar')}>Cancelar suscripción</button>
          </>
        )}
        {s.estado === 'cancelada' && (
          <button className="boton boton--primario" onClick={() => cambiarEstado('activa', 'Suscripción reactivada')}>Reactivar</button>
        )}
      </div>}

      <dl className="datos">
        <div>
          <dt>Próximo cobro</dt>
          <dd>
            {s.estado === 'activa'
              ? `${formatearFecha(s.proxima_fecha_cobro, { day: 'numeric', month: 'long' })} (${describirDias(s.dias_para_cobro).toLowerCase()})`
              : 'Sin cobros mientras no esté activa'}
            {s.estado === 'activa' && s.cobro_en_feriado && <small className="texto-suave"> Cae feriado, el débito puede correrse.</small>}
          </dd>
        </div>
        <div>
          <dt>Día de cobro</dt>
          <dd>{s.dia_cobro}{s.dia_cobro > 28 ? ' (o el último día del mes)' : ''}</dd>
        </div>
        <div>
          <dt>Equivale por mes</dt>
          <dd>{formatearMonto(s.costo_mensual, s.moneda)}</dd>
        </div>
        <div>
          <dt>Desde</dt>
          <dd>{formatearFecha(s.fecha_inicio, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
        </div>
        {s.grupo_nombre && (
          <div>
            <dt>Grupo</dt>
            <dd><Link to={`/grupos/${s.grupo}`}>{s.grupo_nombre}</Link></dd>
          </div>
        )}
      </dl>

      <div className="grilla">
        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Evolución del precio</h2>
            {aumentoTotal !== null && aumentoTotal !== 0 && (
              <span className={aumentoTotal > 0 ? 'aumento' : 'baja'}>
                {aumentoTotal > 0 ? '+' : ''}{aumentoTotal.toFixed(1).replace('.', ',')}% desde el alta
              </span>
            )}
          </div>
          {precios.length > 1 ? (
            <ul className="pagos">
              {precios.map((p, indice) => (
                <li key={`${p.fecha}-${indice}`}>
                  <span>{formatearFecha(p.fecha, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="pagos__monto">{formatearMonto(p.precio, s.moneda)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-suave">
              Todavía no hubo cambios de precio. Cuando edites el monto, cada cambio queda guardado acá.
            </p>
          )}
        </section>

        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Pagos registrados</h2>
            <span className="texto-suave">{pagos.length}</span>
          </div>
          {pagos.length ? (
            <ul className="pagos">
              {pagos.map((p) => (
                <li key={p.id}>
                  <span>
                    {formatearFecha(p.fecha_pago, { day: 'numeric', month: 'short', year: 'numeric' })}
                    <small className="texto-suave"> cubre el {formatearFecha(p.fecha_cobro)}</small>
                  </span>
                  <span className="pagos__monto">
                    {formatearMonto(p.monto, p.moneda)}
                    {p.moneda === 'USD' && p.monto_en_pesos && (
                      <small className="texto-suave">{formatearMonto(p.monto_en_pesos, 'ARS')}</small>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-suave">Sin pagos todavía. Registrá cada cobro para saber cuánto gastaste realmente.</p>
          )}
        </section>
      </div>

      {modal === 'editar' && (
        <FormSuscripcion
          suscripcion={s}
          alCerrar={() => setModal(null)}
          alGuardar={() => {
            setModal(null);
            mostrarToast('Cambios guardados');
            cargarDatos();
          }}
        />
      )}
      {modal === 'pagar' && (
        <ConfirmarPago
          suscripcion={s}
          alCerrar={() => setModal(null)}
          alConfirmar={() => {
            setModal(null);
            mostrarToast(`Pago de ${s.nombre} registrado`);
            cargarDatos();
          }}
        />
      )}
      {modal === 'cancelar' && (
        <Modal titulo={`¿Cancelar ${s.nombre}?`} alCerrar={() => setModal(null)}>
          <p>Deja de aparecer en tus totales y no se generan más avisos. Los pagos y el historial de precios se conservan, y podés reactivarla cuando quieras.</p>
          <div className="formulario__acciones">
            <button className="boton" onClick={() => setModal(null)}>Volver</button>
            <button className="boton boton--peligro-lleno" onClick={cancelar}>Cancelar suscripción</button>
          </div>
        </Modal>
      )}
      {toast && <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} alCerrar={() => setToast(null)} />}
    </>
  );
}
