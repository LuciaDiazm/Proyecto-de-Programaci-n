import { apiNode } from './api';

export const obtenerHistorial = async (suscripcionId) => {
  const respuesta = await apiNode.get(`/api/historial/${suscripcionId}`);
  return respuesta.data;
};

export const obtenerAumentos = async () => {
  const respuesta = await apiNode.get('/api/historial/aumentos');
  return respuesta.data;
};
