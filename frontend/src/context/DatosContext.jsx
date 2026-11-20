import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { categoriaService } from '../services/categoriaService';
import { cotizacionService } from '../services/cotizacionService';
import { notificacionService } from '../services/notificacionService';
import { conectarNotificaciones } from '../services/socket';

// Datos que usan varias pantallas: cotización, categorías y avisos sin leer
const DatosContext = createContext(null);

export function DatosProvider({ children }) {
  const [cotizacion, setCotizacion] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [toast, setToast] = useState(null);

  const actualizarContador = useCallback(() => {
    notificacionService.contador().then((d) => setNoLeidas(d.noLeidas)).catch(() => {});
  }, []);

  const recargarCategorias = useCallback(() => {
    categoriaService.listar().then(setCategorias).catch(() => {});
  }, []);

  const mostrarToast = useCallback((mensaje, tipo = 'ok') => {
    setToast({ mensaje, tipo, id: Date.now() });
  }, []);

  useEffect(() => {
    cotizacionService.obtener().then(setCotizacion).catch(() => setCotizacion(null));
    recargarCategorias();
  }, [recargarCategorias]);

  // Socket.IO avisa al instante; al conectarse se trae el contador por REST
  useEffect(() => {
    const desconectar = conectarNotificaciones({
      alConectar: actualizarContador,
      alRecibir: (notificacion) => {
        setNoLeidas((actual) => actual + 1);
        mostrarToast(notificacion.titulo);
      },
    });
    return desconectar;
  }, [actualizarContador, mostrarToast]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(temporizador);
  }, [toast]);

  return (
    <DatosContext.Provider
      value={{
        cotizacion,
        dolarTarjeta: cotizacion?.tarjeta?.venta ?? null,
        categorias,
        recargarCategorias,
        noLeidas,
        actualizarContador,
        mostrarToast,
      }}
    >
      {children}
      {toast && (
        <div className={`toast toast--${toast.tipo}`} role="status" key={toast.id}>
          {toast.mensaje}
        </div>
      )}
    </DatosContext.Provider>
  );
}

export const useDatos = () => useContext(DatosContext);
