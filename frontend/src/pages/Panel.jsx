import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerDolarTarjeta } from '../services/cotizacionService';
import { obtenerAumentos } from '../services/historialService';
import { obtenerPagos, obtenerPagosPorMes } from '../services/pagoService';
import { obtenerResumen, obtenerSuscripciones } from '../services/suscripcionService';
import { mensajeError } from '../services/api';
import TiraDelMes from '../components/TiraDelMes';
import FilaCobro from '../components/FilaCobro';
import ConfirmarPago from '../components/ConfirmarPago';
import FormSuscripcion from '../components/FormSuscripcion';
import Punto from '../components/Punto';
import Toast from '../components/Toast';
import { IconoFlechaArriba, IconoMas } from '../components/Iconos';
import { formatearFecha, formatearMonto, totalEnPesos } from '../utils/formato';

// Si una de las peticiones falló, se usa un valor vacío para que el resto del panel se vea igual
const valorOVacio = (resultado, vacio) => (resultado.status === 'fulfilled' ? resultado.value : vacio);

export default function Panel() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [pagando, setPagando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const resultados = await Promise.allSettled([
      obtenerResumen(),
      obtenerSuscripciones(),
      obtenerPagos(),
      obtenerPagosPorMes(6),
      obtenerAumentos(),
      obtenerDolarTarjeta(),
    ]);
    if (resultados[0].status === 'rejected') {
      setError(mensajeError(resultados[0].reason));
      return;
    }
    setError('');
    setDatos({
      resumen: resultados[0].value,
      suscripciones: valorOVacio(resultados[1], []),
      pagos: valorOVacio(resultados[2], []),
      porMes: valorOVacio(resultados[3], []),
      aumentos: valorOVacio(resultados[4], []),
      dolarTarjeta: valorOVacio(resultados[5], null),
    });
  };

  const mostrarToast = (mensaje) => setToast({ mensaje, id: Date.now() });

  const alGuardarNueva = (guardada) => {
    setCreando(false);
    mostrarToast(`${guardada.nombre} agregada`);
    cargarDatos();
  };

  const despuesDePagar = () => {
    mostrarToast(`Pago de ${pagando.nombre} registrado`);
    setPagando(null);
    cargarDatos();
  };

  const avisoToast = toast && <Toast key={toast.id} mensaje={toast.mensaje} alCerrar={() => setToast(null)} />;
  const formNueva = creando && <FormSuscripcion alCerrar={() => setCreando(false)} alGuardar={alGuardarNueva} />;

  if (error) return <p className="mensaje mensaje--error">{error}</p>;
  if (!datos) return <div className="esqueleto" aria-busy="true" aria-label="Cargando panel" />;

  const { resumen, suscripciones, pagos, porMes, aumentos, dolarTarjeta } = datos;

  if (suscripciones.length === 0) {
    return (
      <>
        <header className="encabezado">
          <h1>Este mes</h1>
        </header>
        <div className="vacio">
          <h2>Empezá por tu primer gasto fijo</h2>
          <p>Netflix, el gimnasio, internet, el seguro del auto. Con cargar el monto y el día de cobro alcanza.</p>
          <button className="boton boton--primario" onClick={() => setCreando(true)}>
            <IconoMas /> Agregar suscripción
          </button>
        </div>
        {formNueva}
        {avisoToast}
      </>
    );
  }

  const mensual = totalEnPesos(resumen.mensual, dolarTarjeta);
  const anual = totalEnPesos(resumen.anual, dolarTarjeta);
  const proximos = suscripciones
    .filter((s) => s.estado === 'activa' && s.dias_para_cobro <= 31)
    .slice(0, 6);

  // Cuánto se lleva cada categoría del total mensual (de mayor a menor)
  const categorias = resumen.por_categoria
    .map((c) => ({ ...c, total: totalEnPesos(c, dolarTarjeta).pesos }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // Lo pagado en cada uno de los últimos meses
  const meses = porMes.map((m) => ({
    mes: formatearFecha(`${m.mes}-01`, { month: 'long', year: 'numeric' }),
    total: totalEnPesos(m, dolarTarjeta).pesos,
  }));
  const mesMasCaro = Math.max(...meses.map((m) => m.total), 0);
  const porcentajeDe = (total) => Math.round((total / mensual.pesos) * 100);
  const fueraDeTermino = resumen.pagos_fuera_de_termino;
  // Cobros que ya vencieron y todavía no se registraron como pagados
  const olvidados = suscripciones.filter((s) => s.estado === 'activa' && s.dias_para_cobro < 0).length;

  let detalleDolares = '';
  if (mensual.dolaresSinConvertir > 0) {
    detalleDolares = `más ${formatearMonto(mensual.dolaresSinConvertir, 'USD')} (sin cotización disponible). `;
  } else if (resumen.mensual.USD > 0) {
    detalleDolares = `Incluye ${formatearMonto(resumen.mensual.USD, 'USD')} al dólar tarjeta. `;
  }

  return (
    <>
      <header className="encabezado encabezado--panel">
        <div>
          <p className="encabezado__saludo">Tu gasto por mes</p>
          <p className="total">{formatearMonto(mensual.pesos, 'ARS', { decimales: false })}</p>
          <p className="texto-suave">
            {detalleDolares}
            {formatearMonto(anual.pesos, 'ARS', { decimales: false })} al año en {resumen.cantidad_activas}{' '}
            {resumen.cantidad_activas === 1 ? 'suscripción activa' : 'suscripciones activas'}.
          </p>
        </div>
        <button className="boton boton--primario" onClick={() => setCreando(true)}>
          <IconoMas /> Agregar
        </button>
      </header>

      <TiraDelMes suscripciones={suscripciones} pagos={pagos} />

      <div className="grilla">
        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Próximos cobros</h2>
            <Link to="/suscripciones">Ver todas</Link>
          </div>
          {proximos.length ? (
            <ul className="lista-cobros">
              {proximos.map((s) => (
                <FilaCobro key={s.id} suscripcion={s} alPagar={setPagando} />
              ))}
            </ul>
          ) : (
            <p className="texto-suave">No hay cobros en los próximos 31 días.</p>
          )}
        </section>

        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>En qué se va</h2>
          </div>
          {categorias.length > 0 && (
            <p className="texto-suave">
              Lo que más consumís: <strong>{categorias[0].categoria}</strong> ({porcentajeDe(categorias[0].total)}%)
            </p>
          )}
          <ul className="reparto">
            {categorias.map((c) => {
              const porcentaje = porcentajeDe(c.total);
              return (
                <li key={c.categoria}>
                  <Punto color={c.color} />
                  <span className="reparto__nombre">{c.categoria}</span>
                  <span className="reparto__monto">{formatearMonto(c.total, 'ARS', { decimales: false })}</span>
                  <span className="reparto__valor">{porcentaje}%</span>
                  <meter className="reparto__barra" min="0" max="100" value={porcentaje} aria-label={`${c.categoria}: ${porcentaje}%`} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Lo que pagaste</h2>
            <span className="texto-suave">últimos 6 meses</span>
          </div>
          <p className="texto-suave">
            Pagos fuera de término: <strong>{fueraDeTermino}</strong> {fueraDeTermino === 1 ? 'vez' : 'veces'}
          </p>
          <p className="texto-suave">
            Cobros que olvidaste pagar: <strong>{olvidados}</strong>
            {olvidados > 0 && (
              <>
                {' '}
                <Link to="/suscripciones">Ver cuáles</Link>
              </>
            )}
          </p>

          {pagos.length ? (
            <ul className="reparto">
              {meses.map((m) => (
                <li key={m.mes}>
                  <span className="reparto__nombre">{m.mes}</span>
                  <span className="reparto__valor">{formatearMonto(m.total, 'ARS', { decimales: false })}</span>
                  <meter className="reparto__barra" min="0" max={mesMasCaro || 1} value={m.total} aria-label={`${m.mes}: ${formatearMonto(m.total, 'ARS')}`} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-suave">Cuando registres pagos, acá vas a ver cuánto gastaste realmente cada mes.</p>
          )}
        </section>

        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Últimos aumentos</h2>
          </div>
          {aumentos.length ? (
            <ul className="aumentos">
              {aumentos.map((a) => (
                <li key={a._id}>
                  <Link to={`/suscripciones/${a.suscripcionId}`}>{a.nombreSuscripcion}</Link>
                  <span className="texto-suave">
                    {formatearMonto(a.precioAnterior, a.moneda)} a {formatearMonto(a.precioNuevo, a.moneda)}
                  </span>
                  <span className="aumento">
                    <IconoFlechaArriba /> {a.variacionPorcentual.toLocaleString('es-AR')}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-suave">Sin aumentos registrados. Cuando cambies el precio de una suscripción, aparece acá.</p>
          )}
        </section>
      </div>

      {pagando && <ConfirmarPago suscripcion={pagando} alCerrar={() => setPagando(null)} alConfirmar={despuesDePagar} />}
      {formNueva}
      {avisoToast}
    </>
  );
}
