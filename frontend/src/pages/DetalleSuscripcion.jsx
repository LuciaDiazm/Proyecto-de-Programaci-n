import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { historialService } from '../services/historialService';
import { suscripcionService } from '../services/suscripcionService';
import { useDatos } from '../context/DatosContext';
import FormSuscripcion from '../components/FormSuscripcion';
import ConfirmarPago from '../components/ConfirmarPago';
import Modal from '../components/Modal';
import { IconoVolver } from '../components/Iconos';
import { describirDias, ESTADOS, formatearFecha, formatearMonto, FRECUENCIAS } from '../utils/formato';

export default function DetalleSuscripcion() {
  const { id } = useParams();
  const { mostrarToast, actualizarContador } = useDatos();
  const [suscripcion, setSuscripcion] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // 'editar' | 'pagar' | 'cancelar'

  const cargar = useCallback(async () => {
    try {
      const [datos, listaPagos] = await Promise.all([suscripcionService.obtener(id), suscripcionService.pagos(id)]);
      setSuscripcion(datos);
      setPagos(listaPagos);
      setError('');
    } catch (e) {
      setError(e.status === 404 ? 'Esta suscripción no existe o no es tuya.' : e.message);
    }
    // El historial vive en la otra API: si falla, la página igual se muestra
    historialService.deSuscripcion(id).then(setHistorial).catch(() => setHistorial([]));
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = async (estado, mensaje) => {
    try {
      await suscripcionService.actualizar(id, { estado });
      mostrarToast(mensaje);
      cargar();
    } catch (e) {
      mostrarToast(e.message, 'error');
    }
  };

  const cancelar = async () => {
    try {
      await suscripcionService.cancelar(id);
      mostrarToast('Suscripción cancelada');
      setModal(null);
      cargar();
    } catch (e) {
      mostrarToast(e.message, 'error');
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
  // Puntos del gráfico: si el primer registro es un cambio, se agrega el precio anterior como punto de partida
  const enMismaMoneda = historial.filter((h) => h.moneda === s.moneda);
  const aPunto = (fecha, precio) => ({ fecha: formatearFecha(fecha.slice(0, 10), { month: 'short', year: '2-digit' }), precio });
  const puntos = enMismaMoneda.map((h) => aPunto(h.createdAt, h.precioNuevo));
  const primero = enMismaMoneda[0];
  if (primero?.tipo === 'CAMBIO' && primero.precioAnterior !== null && primero.monedaAnterior === s.moneda) {
    puntos.unshift(aPunto(s.fecha_inicio, primero.precioAnterior));
  }
  const primerPrecio = puntos.length ? puntos[0].precio : null;
  const aumentoTotal = primerPrecio ? ((s.monto - primerPrecio) / primerPrecio) * 100 : null;

  return (
    <>
      <Link to="/suscripciones" className="volver"><IconoVolver /> Suscripciones</Link>

      <header className="detalle" style={{ '--color-ficha': s.categoria_detalle?.color || '#64748B' }}>
        <div>
          <p className="detalle__categoria">{s.categoria_detalle?.nombre || 'Sin categoría'}</p>
          <h1>{s.nombre}</h1>
          <p className="detalle__precio">
            {formatearMonto(s.monto, s.moneda)} <span>{FRECUENCIAS[s.frecuencia].toLowerCase()}</span>
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
          {puntos.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={puntos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--linea)" />
                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: 'var(--tinta-suave)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} width={88} tick={{ fill: 'var(--tinta-suave)', fontSize: 12 }}
                  tickFormatter={(v) => formatearMonto(v, s.moneda, { decimales: false })} />
                <Tooltip formatter={(v) => [formatearMonto(v, s.moneda), 'Precio']} />
                <Line type="stepAfter" dataKey="precio" stroke="var(--verde)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--verde)' }} />
              </LineChart>
            </ResponsiveContainer>
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

      {modal === 'editar' && <FormSuscripcion suscripcion={s} alCerrar={() => setModal(null)} alGuardar={() => { setModal(null); cargar(); }} />}
      {modal === 'pagar' && (
        <ConfirmarPago suscripcion={s} alCerrar={() => setModal(null)} alConfirmar={() => { setModal(null); cargar(); actualizarContador(); }} />
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
    </>
  );
}
