import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { suscripcionService } from '../services/suscripcionService';
import { useDatos } from '../context/DatosContext';
import FormSuscripcion from '../components/FormSuscripcion';
import ConfirmarPago from '../components/ConfirmarPago';
import { IconoCheck, IconoMas } from '../components/Iconos';
import { describirDias, estadoDeCobro, formatearFecha, formatearMonto, FRECUENCIAS, iniciales } from '../utils/formato';

const PESTANAS = [
  { valor: 'activa', texto: 'Activas' },
  { valor: 'pausada', texto: 'Pausadas' },
  { valor: 'cancelada', texto: 'Canceladas' },
];

export default function Suscripciones() {
  const { actualizarContador } = useDatos();
  const [todas, setTodas] = useState(null);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('activa');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('proximo');
  const [creando, setCreando] = useState(false);
  const [pagando, setPagando] = useState(null);

  const cargar = useCallback(() => {
    suscripcionService
      .listar(true)
      .then((lista) => {
        setTodas(lista);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    if (!todas) return [];
    const texto = busqueda.trim().toLowerCase();
    const lista = todas.filter(
      (s) =>
        s.estado === estado &&
        (!texto || s.nombre.toLowerCase().includes(texto) || s.categoria_detalle?.nombre.toLowerCase().includes(texto))
    );
    const comparadores = {
      proximo: (a, b) => a.proxima_fecha_cobro.localeCompare(b.proxima_fecha_cobro),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      // Ordena por costo mensual (los dólares se comparan aparte, quedan arriba)
      monto: (a, b) => (b.moneda === a.moneda ? b.costo_mensual - a.costo_mensual : a.moneda === 'USD' ? -1 : 1),
    };
    return [...lista].sort(comparadores[orden]);
  }, [todas, estado, busqueda, orden]);

  const cantidad = (valor) => todas?.filter((s) => s.estado === valor).length ?? 0;

  return (
    <>
      <header className="encabezado">
        <h1>Suscripciones</h1>
        <button className="boton boton--primario" onClick={() => setCreando(true)}>
          <IconoMas /> Agregar
        </button>
      </header>

      <div className="filtros">
        <div className="pestanas" role="tablist" aria-label="Estado">
          {PESTANAS.map((p) => (
            <button
              key={p.valor}
              role="tab"
              aria-selected={estado === p.valor}
              className="pestana"
              onClick={() => setEstado(p.valor)}
            >
              {p.texto} <span className="pestana__cantidad">{cantidad(p.valor)}</span>
            </button>
          ))}
        </div>
        <div className="filtros__derecha">
          <input
            className="buscador"
            type="search"
            placeholder="Buscar por nombre o categoría"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar"
          />
          <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
            <option value="proximo">Próximo cobro</option>
            <option value="monto">Más caras</option>
            <option value="nombre">Nombre</option>
          </select>
        </div>
      </div>

      {error && <p className="mensaje mensaje--error">{error}</p>}
      {!todas && !error && <div className="esqueleto" aria-busy="true" />}

      {todas && visibles.length === 0 && (
        <div className="vacio vacio--chico">
          <p>
            {busqueda
              ? 'Ninguna suscripción coincide con la búsqueda.'
              : estado === 'activa'
                ? 'No tenés suscripciones activas. Agregá la primera para empezar a controlar tus gastos.'
                : `No hay suscripciones ${estado === 'pausada' ? 'pausadas' : 'canceladas'}.`}
          </p>
        </div>
      )}

      {visibles.length > 0 && (
        <ul className="tabla">
          <li className="tabla__fila tabla__fila--titulos" aria-hidden="true">
            <span>Servicio</span>
            <span>Monto</span>
            <span>Por mes</span>
            <span>Próximo cobro</span>
            <span />
          </li>
          {visibles.map((s) => (
            <li key={s.id} className="tabla__fila">
              <span className="tabla__servicio">
                <span className="cobro__sello" style={{ background: s.categoria_detalle?.color || '#64748B' }} aria-hidden="true">
                  {iniciales(s.nombre)}
                </span>
                <span>
                  <Link to={`/suscripciones/${s.id}`} className="tabla__nombre">{s.nombre}</Link>
                  <span className="texto-suave">{s.categoria_detalle?.nombre || 'Sin categoría'} · {FRECUENCIAS[s.frecuencia]}</span>
                </span>
              </span>
              <span className="tabla__monto">{formatearMonto(s.monto, s.moneda)}</span>
              <span className="texto-suave tabla__mensual">{formatearMonto(s.costo_mensual, s.moneda)}</span>
              <span className={`tabla__cuando cobro--${s.estado === 'activa' ? estadoDeCobro(s.dias_para_cobro) : 'normal'}`}>
                {s.estado === 'activa' ? (
                  <>
                    <strong>{formatearFecha(s.proxima_fecha_cobro)}</strong>
                    <span>{describirDias(s.dias_para_cobro)}</span>
                  </>
                ) : (
                  <span className="texto-suave">{s.estado === 'pausada' ? 'En pausa' : 'Cancelada'}</span>
                )}
              </span>
              <span className="tabla__acciones">
                {s.estado === 'activa' && (
                  <button className="boton-icono boton-icono--borde" onClick={() => setPagando(s)} aria-label={`Registrar pago de ${s.nombre}`} title="Registrar pago">
                    <IconoCheck />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {creando && <FormSuscripcion alCerrar={() => setCreando(false)} alGuardar={() => { setCreando(false); cargar(); }} />}
      {pagando && (
        <ConfirmarPago
          suscripcion={pagando}
          alCerrar={() => setPagando(null)}
          alConfirmar={() => { setPagando(null); cargar(); actualizarContador(); }}
        />
      )}
    </>
  );
}
