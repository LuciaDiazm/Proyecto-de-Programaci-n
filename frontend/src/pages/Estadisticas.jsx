import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerResumen, obtenerSuscripciones } from '../services/suscripcionService';
import { obtenerDolarTarjeta } from '../services/cotizacionService';
import { mensajeError } from '../services/api';
import TituloConAyuda from '../components/TituloConAyuda';
import Punto from '../components/Punto';
import { colorDeCategoria, gastoPorCategoria, nombreDeCategoria, totalEnPesos } from '../utils/formato';

export default function Estadisticas() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [dolar, setDolar] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarDatos();
    cargarDolar();
  }, []);

  const cargarDatos = async () => {
    try {
      const [lista, datos] = await Promise.all([obtenerSuscripciones(), obtenerResumen()]);
      setSuscripciones(lista);
      setResumen(datos);
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  // Si la cotización no llega, los dólares no se suman a "lo que más consumís"
  const cargarDolar = async () => {
    try {
      setDolar(await obtenerDolarTarjeta());
    } catch (err) {
      setDolar(null);
    }
  };

  if (error) return <p className="mensaje mensaje--error">{error}</p>;
  if (!resumen) return <div className="esqueleto" aria-busy="true" aria-label="Cargando estadísticas" />;

  // Cuántas suscripciones hay en cada categoría (de más a menos)
  const grupos = {};
  for (const s of suscripciones) {
    const nombre = nombreDeCategoria(s);
    if (!grupos[nombre]) grupos[nombre] = { nombre, color: colorDeCategoria(s), suscripciones: [] };
    grupos[nombre].suscripciones.push(s);
  }
  const porCategoria = Object.values(grupos).sort((a, b) => b.suscripciones.length - a.suscripciones.length);

  // Porciones de la torta: cada categoría ocupa su parte del 100 %
  const porcentajeDe = (c) => (c.suscripciones.length / suscripciones.length) * 100;
  let acumulado = 0;
  const porciones = porCategoria.map((c) => {
    const desde = acumulado;
    acumulado += porcentajeDe(c);
    return `${c.color} ${desde}% ${acumulado}%`;
  });

  // La categoría en la que más se gasta por mes, en pesos
  const gastos = gastoPorCategoria(resumen.por_categoria, dolar);
  const mensual = totalEnPesos(resumen.mensual, dolar).pesos;
  const masConsumo = gastos.length ? gastos[0] : null;

  // Cobros vencidos que todavía no se registraron como pagados
  const atrasadas = suscripciones.filter((s) => s.estado === 'activa' && s.dias_para_cobro < 0);
  const fueraDeTermino = resumen.pagos_fuera_de_termino;

  return (
    <>
      <header className="encabezado">
        <div>
          <TituloConAyuda titulo="Estadísticas">
            Cuántas suscripciones tenés en cada categoría, en cuál gastás más y cómo venís con los pagos.
          </TituloConAyuda>
        </div>
      </header>

      <dl className="datos datos--tres">
        <div>
          <dt>Lo que más consumís</dt>
          <dd>{masConsumo ? `${masConsumo.categoria} (${Math.round((masConsumo.total / mensual) * 100)}%)` : '—'}</dd>
        </div>
        <div>
          <dt>Pagos fuera de término</dt>
          <dd>{fueraDeTermino} {fueraDeTermino === 1 ? 'vez' : 'veces'}</dd>
        </div>
        <div>
          <dt>Cobros sin pagar</dt>
          <dd>{atrasadas.length}</dd>
        </div>
      </dl>

      <div className="grilla">
        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Suscripciones por categoría</h2>
            <span className="texto-suave">{suscripciones.length}</span>
          </div>
          {porCategoria.length ? (
            <div className="torta-contenedor">
              <div
                className="torta"
                style={{ background: `conic-gradient(${porciones.join(', ')})` }}
                role="img"
                aria-label="Suscripciones por categoría"
              />
              <ul className="torta__leyenda">
                {porCategoria.map((c) => (
                  <li key={c.nombre}>
                    <Punto color={c.color} />
                    <span className="reparto__nombre">{c.nombre}</span>
                    <span className="reparto__valor">
                      {c.suscripciones.length} ({Math.round(porcentajeDe(c))}%)
                    </span>
                    <small className="texto-suave torta__nombres">{c.suscripciones.map((s) => s.nombre).join(', ')}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="texto-suave">Todavía no cargaste suscripciones.</p>
          )}
        </section>

        <section className="bloque">
          <div className="bloque__cabecera">
            <h2>Cobros sin pagar</h2>
          </div>
          {atrasadas.length ? (
            <ul className="pagos">
              {atrasadas.map((s) => (
                <li key={s.id}>
                  <Link to={`/suscripciones/${s.id}`}>{s.nombre}</Link>
                  <span className="texto-suave">Venció hace {-s.dias_para_cobro} {s.dias_para_cobro === -1 ? 'día' : 'días'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-suave">No tenés cobros vencidos sin pagar.</p>
          )}
        </section>
      </div>
    </>
  );
}