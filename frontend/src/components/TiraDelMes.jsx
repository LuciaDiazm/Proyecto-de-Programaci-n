import { Link } from 'react-router-dom';
import { aFecha, colorDeCategoria, formatearMonto } from '../utils/formato';
import { IconoCheck } from './Iconos';
import Sello from './Sello';

/*
  El calendario de débitos del mes: cada cobro aparece en el día en que se debita.
  - Pendientes: suscripciones activas cuya próxima fecha cae en este mes.
  - Pagados: pagos registrados que cubrían un vencimiento de este mes.
*/
function armarDias(suscripciones, pagos, anio, mes, diasDelMes) {
  const dias = Array.from({ length: diasDelMes }, () => []);
  const enEsteMes = (texto) => {
    const fecha = aFecha(texto);
    return fecha.getFullYear() === anio && fecha.getMonth() === mes ? fecha.getDate() : null;
  };

  for (const pago of pagos) {
    const dia = enEsteMes(pago.fecha_cobro);
    if (dia) {
      dias[dia - 1].push({
        clave: `p${pago.id}`,
        id: pago.suscripcion,
        nombre: pago.suscripcion_nombre,
        monto: pago.monto,
        moneda: pago.moneda,
        pagado: true,
      });
    }
  }
  for (const s of suscripciones) {
    const dia = enEsteMes(s.proxima_fecha_cobro);
    if (dia && s.estado === 'activa') {
      dias[dia - 1].push({
        clave: `s${s.id}`,
        id: s.id,
        nombre: s.nombre,
        monto: s.monto,
        moneda: s.moneda,
        color: colorDeCategoria(s),
        pagado: false,
      });
    }
  }
  return dias;
}

// Encabezado de la grilla: la semana empieza el domingo, como getDay()
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function TiraDelMes({ suscripciones, pagos }) {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  const nombreMes = hoy.toLocaleDateString('es-AR', { month: 'long' });
  const diaHoy = hoy.getDate();
  // Columna en la que cae el día 1 (de 1 a 7), para que cada día quede bajo su letra
  const columnaDelUno = new Date(anio, mes, 1).getDay() + 1;

  const porDia = armarDias(suscripciones, pagos, anio, mes, diasDelMes);
  const pendientes = porDia.flat().filter((c) => !c.pagado).length;

  return (
    <section className="tira" aria-label={`Cobros de ${nombreMes}`}>
      <div className="tira__cabecera">
        <h2>
          Débitos de <span className="tira__mes">{nombreMes}</span>
        </h2>
        <p className="tira__leyenda">
          <span className="punto punto--pendiente" /> Por cobrar
          <span className="punto punto--pagado" /> Ya pagado
        </p>
      </div>

      <div className="tira__semana" aria-hidden="true">
        {DIAS_SEMANA.map((letra, indice) => <span key={indice}>{letra}</span>)}
      </div>

      <div className="tira__dias" role="list">
        {porDia.map((cobros, indice) => {
          const dia = indice + 1;
          const clases = ['tira__dia'];
          if (dia === 1) clases.push(`tira__dia--columna-${columnaDelUno}`);
          if (dia === diaHoy) clases.push('tira__dia--hoy');
          if (dia < diaHoy) clases.push('tira__dia--pasado');
          if (cobros.length) clases.push('tira__dia--con-cobro');

          return (
            <div key={dia} className={clases.join(' ')} role="listitem">
              <span className="tira__numero">{dia}</span>
              <div className="tira__fichas">
                {cobros.map((c) => (
                  <Link
                    key={c.clave}
                    to={`/suscripciones/${c.id}`}
                    className={`ficha ${c.pagado ? 'ficha--pagada' : ''}`}
                    title={`${c.nombre}: ${formatearMonto(c.monto, c.moneda)}${c.pagado ? ' (pagado)' : ''}`}
                  >
                    {/* Lo pagado lleva un ✓ para no confundirse con un cobro pendiente gris */}
                    {c.pagado ? <IconoCheck /> : <Sello nombre={c.nombre} color={c.color} tamano={27} />}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {pendientes === 0 && (
        <p className="tira__vacio">No quedan débitos pendientes este mes.</p>
      )}
    </section>
  );
}
