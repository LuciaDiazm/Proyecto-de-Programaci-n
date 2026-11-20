import { apiNode } from './api';

// Devuelve el dólar tarjeta (venta) o null si la API externa no respondió
export const obtenerDolarTarjeta = async () => {
  const respuesta = await apiNode.get('/api/cotizacion');
  const tarjeta = respuesta.data.tarjeta;
  return tarjeta ? tarjeta.venta : null;
};
