import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerSuscripciones } from '../services/suscripcionService';
import { obtenerDolarTarjeta } from '../services/cotizacionService';
import { mensajeError } from '../services/api';
import FormSuscripcion from '../components/FormSuscripcion';
import ConfirmarPago from '../components/ConfirmarPago';
import Sello from '../components/Sello';
import Toast from '../components/Toast';
import TituloConAyuda from '../components/TituloConAyuda';
import { IconoCheck, IconoMas } from '../components/Iconos';
import {
  colorDeCategoria,
  describirDias,
  estadoDeCobro,
  formatearFecha,
  formatearMonto,
  nombreDeCategoria,
  textoFrecuencia,
  totalEnPesos,
} from '../utils/formato';

const PESTANAS = [
  { valor: 'activa', texto: 'Activas' },
  { valor: 'pausada', texto: 'Pausadas' },
  { valor: 'cancelada', texto: 'Canceladas' },
];

const COMPARADORES = {
  proximo: (a, b) => a.proxima_fecha_cobro.localeCompare(b.proxima_fecha_cobro),
  nombre: (a, b) => a.nombre.localeCompare(b.nombre),
  // Ordena por costo mensual (los dólares se comparan aparte y quedan arriba)
  monto: (a, b) => {
    if (a.moneda === b.moneda) return b.costo_mensual - a.costo_mensual;
    return a.moneda === 'USD' ? -1 : 1;
  },
};

export default function Suscripciones() {
  const [todas, setTodas] = useState(null);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('activa');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('proximo');
  const [creando, setCreando] = useState(false);
  const [pagando, setPagando] = useState(null);
  const [toast, setToast] = useState(null);

  const [dolar, setDolar] = useState(null);

  useEffect(() => {
    cargarDatos();
    cargarDolar();
  }, []);

  // Si la cotización no llega, la lista se muestra igual, sin el equivalente en pesos
  const cargarDolar = async () => {
    try {
      setDolar(await obtenerDolarTarjeta());
    } catch (err) {
      setDolar(null);
    }
  };

  const cargarDatos = async () => {
    try {
      setTodas(await obtenerSuscripciones(true));
      setError('');
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const mostrarToast = (mensaje) => setToast({ mensaje, id: Date.now() });

  // Filtra por pestaña y búsqueda, y ordena según lo elegido
  const texto = busqueda.trim().toLowerCase();
  const coincide = (s) =>
    !texto || s.nombre.toLowerCase().includes(texto) || nombreDeCategoria(s).toLowerCase().includes(texto);
  const lista = todas ? todas : [];
  const visibles = lista.filter((s) => s.estado === estado && coincide(s)).sort(COMPARADORES[orden]);

  const cantidad = (valor) => lista.filter((s) => s.estado === valor).length;

  return (
    <>
      <header className="encabezado">
        <div>
          <TituloConAyuda titulo="Suscripciones">
            Todas tus suscripciones. Tocá el nombre para ver el detalle y el historial de precios, y el ✓ para registrar
            un pago.
          </TituloConAyuda>
        </div>
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
                <Sello nombre={s.nombre} color={colorDeCategoria(s)} />
                <span>
                  <Link to={`/suscripciones/${s.id}`} className="tabla__nombre">{s.nombre}</Link>
                  <span className="texto-suave">{nombreDeCategoria(s)} · {textoFrecuencia(s)}</span>
                </span>
              </span>
                            <span className="tabla__monto">
                {formatearMonto(s.monto, s.moneda)}
                {s.moneda === 'USD' && dolar && (
                  <small className="texto-suave"> ≈ {formatearMonto(totalEnPesos({ USD: s.monto }, dolar).pesos, 'ARS', { decimales: false })}</small>
                )}
              </span>
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

      {creando && (
        <FormSuscripcion
          alCerrar={() => setCreando(false)}
          alGuardar={(guardada) => {
            setCreando(false);
            mostrarToast(`${guardada.nombre} agregada`);
            cargarDatos();
          }}
        />
      )}
      {pagando && (
        <ConfirmarPago
          suscripcion={pagando}
          alCerrar={() => setPagando(null)}
          alConfirmar={() => {
            mostrarToast(`Pago de ${pagando.nombre} registrado`);
            setPagando(null);
            cargarDatos();
          }}
        />
      )}
      {toast && <Toast key={toast.id} mensaje={toast.mensaje} alCerrar={() => setToast(null)} />}
    </>
  );
}
