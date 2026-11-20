import { Link } from 'react-router-dom';
import { describirDias, estadoDeCobro, formatearFecha, formatearMonto, iniciales } from '../utils/formato';
import { IconoCheck } from './Iconos';

export default function FilaCobro({ suscripcion, alPagar }) {
  const estado = estadoDeCobro(suscripcion.dias_para_cobro);
  return (
    <li className={`cobro cobro--${estado}`}>
      <span className="cobro__sello" style={{ background: suscripcion.categoria_detalle?.color || '#64748B' }} aria-hidden="true">
        {iniciales(suscripcion.nombre)}
      </span>
      <div className="cobro__info">
        <Link to={`/suscripciones/${suscripcion.id}`} className="cobro__nombre">{suscripcion.nombre}</Link>
        <span className="cobro__cuando">
          {describirDias(suscripcion.dias_para_cobro)} · {formatearFecha(suscripcion.proxima_fecha_cobro)}
        </span>
      </div>
      <span className="cobro__monto">{formatearMonto(suscripcion.monto, suscripcion.moneda)}</span>
      {alPagar && (
        <button
          className="boton-icono boton-icono--borde"
          onClick={() => alPagar(suscripcion)}
          aria-label={`Registrar pago de ${suscripcion.nombre}`}
          title="Registrar pago"
        >
          <IconoCheck />
        </button>
      )}
    </li>
  );
}
