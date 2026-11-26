import { useEffect, useState } from 'react';
import { analizarGastos, obtenerUltimoAnalisis } from '../services/iaService';
import { mensajeError } from '../services/api';
import { formatearMonto } from '../utils/formato';
import TituloConAyuda from '../components/TituloConAyuda';

const ACCIONES = {
  MANTENER: { texto: 'Mantener', clase: 'mantener' },
  REVISAR: { texto: 'Revisar', clase: 'revisar' },
  CANCELAR: { texto: 'Cancelar', clase: 'cancelar' },
};

// enPanel: se muestra dentro del desplegable de arriba, con una cabecera más chica
export default function Asesor({ enPanel }) {
  const [analisis, setAnalisis] = useState(null);
  const [cargandoUltimo, setCargandoUltimo] = useState(true);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    obtenerUltimoAnalisis()
      .then(setAnalisis)
      .catch(() => setAnalisis(null))
      .finally(() => setCargandoUltimo(false));
  }, []);

  const analizar = async () => {
    setError('');
    setAnalizando(true);
    try {
      setAnalisis(await analizarGastos());
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setAnalizando(false);
    }
  };

  const r = analisis ? analisis.resultado : null;
  const fecha = analisis
    ? new Date(analisis.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  const botonAnalizar = (
    <button className="boton boton--primario" onClick={analizar} disabled={analizando}>
      {analizando ? 'Analizando…' : analisis ? 'Analizar de nuevo' : 'Analizar mis gastos'}
    </button>
  );

  return (
    <>
      {enPanel ? (
        <div className="desplegable__cabecera">
          <h2>Asesor IA</h2>
          <p className="texto-suave">Revisa tus suscripciones activas y te dice cuánto podrías ahorrar.</p>
          {botonAnalizar}
        </div>
      ) : (
        <header className="encabezado">
          <div>
            <TituloConAyuda titulo="Asesor IA">
              Revisa tus suscripciones activas y te dice cuáles se superponen, cuáles conviene revisar y cuánto podrías ahorrar.
            </TituloConAyuda>
          </div>
          {botonAnalizar}
        </header>
      )}

      {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
      {analizando && <div className="esqueleto esqueleto--ia" aria-busy="true" aria-label="La IA está analizando tus suscripciones" />}

      {!analizando && !cargandoUltimo && !r && !error && (
        <div className="vacio vacio--chico">
          <p>Todavía no hiciste ningún análisis. Tarda unos segundos y usa tus suscripciones activas.</p>
        </div>
      )}

      {!analizando && r && (
        <div className="asesor">
          <section className="asesor__resumen">
            <p className="texto-suave">Análisis del {fecha}</p>
            <p className="asesor__texto">{r.resumen}</p>
            {r.ahorroPosibleMensualARS > 0 && (
              <p className="asesor__ahorro">
                Podrías ahorrar <strong>{formatearMonto(r.ahorroPosibleMensualARS, 'ARS', { decimales: false })}</strong> por mes,{' '}
                {formatearMonto(r.ahorroPosibleMensualARS * 12, 'ARS', { decimales: false })} al año.
              </p>
            )}
          </section>

          <ul className="sugerencias">
            {r.sugerencias.map((s, i) => {
              const accion = ACCIONES[s.accion] || ACCIONES.REVISAR;
              return (
                <li key={`${s.suscripcion}-${i}`} className={`sugerencia sugerencia--${accion.clase}`}>
                  <div className="sugerencia__cabecera">
                    <strong>{s.suscripcion}</strong>
                    <span className="sugerencia__accion">{accion.texto}</span>
                  </div>
                  <p>{s.motivo}</p>
                  {s.ahorroMensualARS > 0 && (
                    <p className="texto-suave">Ahorro: {formatearMonto(s.ahorroMensualARS, 'ARS', { decimales: false })} por mes</p>
                  )}
                </li>
              );
            })}
          </ul>

          {r.consejo && <p className="asesor__consejo">{r.consejo}</p>}
          <p className="texto-suave asesor__nota">
            Sugerencias generadas con IA a partir de tus datos. Revisalas antes de cancelar algo.
          </p>
        </div>
      )}
    </>
  );
}
