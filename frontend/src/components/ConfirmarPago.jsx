import { useState } from 'react';
import { suscripcionService } from '../services/suscripcionService';
import { useDatos } from '../context/DatosContext';
import { formatearFecha, formatearMonto, hoyISO } from '../utils/formato';
import Modal from './Modal';

export default function ConfirmarPago({ suscripcion, alCerrar, alConfirmar }) {
  const { dolarTarjeta, mostrarToast } = useDatos();
  const esDolar = suscripcion.moneda === 'USD';
  const [monto, setMonto] = useState(String(suscripcion.monto));
  const [fecha, setFecha] = useState(hoyISO());
  const [cotizacion, setCotizacion] = useState(dolarTarjeta ? String(dolarTarjeta) : '');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    const datos = { monto: monto.replace(',', '.'), fecha_pago: fecha };
    if (esDolar && cotizacion) datos.cotizacion = cotizacion.replace(',', '.');
    try {
      const resultado = await suscripcionService.registrarPago(suscripcion.id, datos);
      mostrarToast(`Pago de ${suscripcion.nombre} registrado`);
      alConfirmar(resultado);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  const enPesos = esDolar && cotizacion ? Number(monto.replace(',', '.')) * Number(cotizacion.replace(',', '.')) : null;

  return (
    <Modal titulo={`Registrar pago de ${suscripcion.nombre}`} alCerrar={alCerrar}>
      <form className="formulario" onSubmit={enviar}>
        <p className="texto-suave">
          Vencimiento del {formatearFecha(suscripcion.proxima_fecha_cobro, { day: 'numeric', month: 'long' })}.
          Al registrarlo, el próximo cobro pasa al período siguiente.
        </p>
        <div className="formulario__fila">
          <label className="campo">
            <span>Monto cobrado ({suscripcion.moneda})</span>
            <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" required />
          </label>
          <label className="campo">
            <span>Fecha de pago</span>
            <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} required />
          </label>
        </div>
        {esDolar && (
          <label className="campo">
            <span>Cotización usada (pesos por dólar)</span>
            <input value={cotizacion} onChange={(e) => setCotizacion(e.target.value)} inputMode="decimal" placeholder="Ej: 2002" />
            <small>
              {enPesos ? `Equivale a ${formatearMonto(enPesos, 'ARS')}. ` : ''}
              Completamos el dólar tarjeta del día; cambialo si tu resumen dice otro valor.
            </small>
          </label>
        )}
        {Number(monto.replace(',', '.')) !== Number(suscripcion.monto) && (
          <p className="mensaje mensaje--info">
            El monto es distinto al registrado. Si el precio cambió, editá la suscripción para que quede en el historial.
          </p>
        )}
        {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
        <div className="formulario__acciones">
          <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
          <button className="boton boton--primario" disabled={enviando}>
            {enviando ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
