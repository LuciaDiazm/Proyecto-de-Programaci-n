import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { historialService } from '../services/historialService';
import { pagoService } from '../services/pagoService';
import { suscripcionService } from '../services/suscripcionService';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import TiraDelMes from '../components/TiraDelMes';
import FilaCobro from '../components/FilaCobro';
import ConfirmarPago from '../components/ConfirmarPago';
import FormSuscripcion from '../components/FormSuscripcion';
import { IconoFlechaArriba, IconoMas } from '../components/Iconos';
import { formatearFecha, formatearMonto, totalEnPesos } from '../utils/formato';

const valorOVacio = (resultado, vacio) => (resultado.status === 'fulfilled' ? resultado.value : vacio);

export default function Panel() {
  const { usuario } = useAuth();
  const { dolarTarjeta, actualizarContador } = useDatos();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [pagando, setPagando] = useState(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    const resultados = await Promise.allSettled([
      suscripcionService.resumen(),
      suscripcionService.listar(),
      pagoService.listar(),
      pagoService.porMes(6),
      historialService.aumentos(),
    ]);
    if (resultados[0].status === 'rejected') {
      setError(resultados[0].reason.message);
      return;
    }
    setError('');
    setDatos({
      resumen: resultados[0].value,
      suscripciones: valorOVacio(resultados[1], []),
      pagos: valorOVacio(resultados[2], []),
      porMes: valorOVacio(resultados[3], []),
      aumentos: valorOVacio(resultados[4], []),
    });
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <p className="mensaje mensaje--error">{error}</p>;
  if (!datos) return <div className="esqueleto" aria-busy="true" aria-label="Cargando panel" />;

  const { resumen, suscripciones, pagos, porMes, aumentos } = datos;
  const mensual = totalEnPesos(resumen.mensual, dolarTarjeta);
  const anual = totalEnPesos(resumen.anual, dolarTarjeta);
  const proximos = suscripciones
    .filter((s) => s.estado === 'activa' && s.dias_para_cobro <= 31)
    .slice(0, 6);

  const categorias = resumen.por_categoria
    .map((c) => ({ ...c, total: totalEnPesos(c, dolarTarjeta).pesos }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const barras = porMes.map((m) => ({
    mes: formatearFecha(`${m.mes}-01`, { month: 'short' }),
    total: totalEnPesos(m, dolarTarjeta).pesos,
  }));

  const despuesDePagar = () => {
    setPagando(null);
    cargar();
    actualizarContador();
  };

  if (suscripciones.length === 0) {
    return (
      <>
        <header className="encabezado">
          <h1>Hola, {usuario.nombre.split(' ')[0]}</h1>
        </header>
        <div className="vacio">
          <h2>Empezá por tu primer gasto fijo</h2>
          <p>Netflix, el gimnasio, internet, el seguro del auto. Con cargar el monto y el día de cobro alcanza.</p>
          <button className="boton boton--primario" onClick={() => setCreando(true)}>
            <IconoMas /> Agregar suscripción
          </button>
        </div>
        {creando && <FormSuscripcion alCerrar={() => setCreando(false)} alGuardar={() => { setCreando(false); cargar(); }} />}
      </>
    );
  }

  return (
    <>
      <header className="encabezado encabezado--panel">
        <div>
          <p className="encabezado__saludo">Hola, {usuario.nombre.split(' ')[0]}. Por mes pagás</p>
          <p className="total">{formatearMonto(mensual.pesos, 'ARS', { decimales: false })}</p>
          <p className="texto-suave">
            {mensual.dolaresSinConvertir > 0
              ? `más ${formatearMonto(mensual.dolaresSinConvertir, 'USD')} (sin cotización disponible). `
              : resumen.mensual.USD > 0
                ? `Incluye ${formatearMonto(resumen.mensual.USD, 'USD')} al dólar tarjeta. `
                : ''}
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
          <div className="dona">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categorias} dataKey="total" nameKey="categoria" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                  {categorias.map((c) => (
                    <Cell key={c.categoria} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(valor) => formatearMonto(valor, 'ARS', { decimales: false })} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="leyenda">
              {categorias.map((c) => (
                <li key={c.categoria}>
                  <span className="punto" style={{ background: c.color }} />
                  <span className="leyenda__nombre">{c.categoria}</span>
                  <span className="leyenda__valor">{Math.round((c.total / mensual.pesos) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Lo que pagaste</h2>
            <span className="texto-suave">últimos 6 meses</span>
          </div>
          {pagos.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barras} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: 'var(--tinta-suave)', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'var(--niebla)' }} formatter={(valor) => [formatearMonto(valor, 'ARS', { decimales: false }), 'Pagado']} />
                <Bar dataKey="total" fill="var(--verde)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
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
      {creando && <FormSuscripcion alCerrar={() => setCreando(false)} alGuardar={() => { setCreando(false); cargar(); }} />}
    </>
  );
}
