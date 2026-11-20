import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { aFecha, formatearMonto, iniciales } from '../utils/formato';

/*
  El calendario de débitos del mes: cada cobro aparece en el día en que se debita.
  - Pendientes: suscripciones activas cuya próxima fecha cae en este mes.
  - Pagados: pagos registrados que cubrían un vencimiento de este mes.
*/
export default function TiraDelMes({ suscripciones, pagos }) {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  const nombreMes = hoy.toLocaleDateString('es-AR', { month: 'long' });

  const porDia = useMemo(() => {
    const dias = Array.from({ length: diasDelMes }, () => []);
    const enEsteMes = (texto) => {
      const fecha = aFecha(texto);
      return fecha.getFullYear() === anio && fecha.getMonth() === mes ? fecha.getDate() : null;
    };

    const colorPorSuscripcion = new Map(
      suscripciones.map((s) => [s.id, s.categoria_detalle?.color || '#64748B'])
    );

    for (const pago of pagos) {
      const dia = enEsteMes(pago.fecha_cobro);
      if (dia) {
        dias[dia - 1].push({
          clave: `p${pago.id}`,
          id: pago.suscripcion,
          nombre: pago.suscripcion_nombre,
          monto: pago.monto,
          moneda: pago.moneda,
          color: colorPorSuscripcion.get(pago.suscripcion) || '#64748B',
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
          color: s.categoria_detalle?.color || '#64748B',
          pagado: false,
        });
      }
    }
    return dias;
  }, [suscripciones, pagos, anio, mes, diasDelMes]);

  const diaHoy = hoy.getDate();
  const contenedor = useRef(null);

  // En pantallas angostas la tira se desplaza sola hasta el día de hoy
  useEffect(() => {
    const caja = contenedor.current;
    const celdaHoy = caja?.querySelector('.tira__dia--hoy');
    if (caja && celdaHoy && caja.scrollWidth > caja.clientWidth) {
      caja.scrollLeft = celdaHoy.offsetLeft - caja.offsetLeft - 8;
    }
  }, []);
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

      <div className="tira__dias" role="list" ref={contenedor}>
        {porDia.map((cobros, indice) => {
          const dia = indice + 1;
          const clases = ['tira__dia'];
          if (dia === diaHoy) clases.push('tira__dia--hoy');
          if (dia < diaHoy) clases.push('tira__dia--pasado');
          if (cobros.length) clases.push('tira__dia--con-cobro');
          const diaSemana = new Date(anio, mes, dia).toLocaleDateString('es-AR', { weekday: 'narrow' });

          return (
            <div key={dia} className={clases.join(' ')} role="listitem">
              <span className="tira__semana" aria-hidden="true">{diaSemana}</span>
              <span className="tira__numero">{dia}</span>
              <div className="tira__fichas">
                {cobros.map((c) => (
                  <Link
                    key={c.clave}
                    to={`/suscripciones/${c.id}`}
                    className={`ficha ${c.pagado ? 'ficha--pagada' : ''}`}
                    style={{ '--color-ficha': c.color }}
                    title={`${c.nombre}: ${formatearMonto(c.monto, c.moneda)}${c.pagado ? ' (pagado)' : ''}`}
                  >
                    {iniciales(c.nombre)}
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
