import { Link } from 'react-router-dom';
import { colorDeCategoria, describirDias, estadoDeCobro, formatearFecha, formatearMonto } from '../utils/formato';
import { IconoCheck } from './Iconos';
import Sello from './Sello';

export default function FilaCobro({ suscripcion, alPagar }) {
  const estado = estadoDeCobro(suscripcion.dias_para_cobro);
  return (
    <li className={`cobro cobro--${estado}`}>
      <Sello nombre={suscripcion.nombre} color={colorDeCategoria(suscripcion)} />
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
