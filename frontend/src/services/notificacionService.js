import { apiNode } from './api';

const NOTIFICACIONES_URL = '/api/notificaciones';

export const obtenerNotificaciones = async () => {
  const respuesta = await apiNode.get(NOTIFICACIONES_URL);
  return respuesta.data;
};

export const obtenerNoLeidas = async () => {
  const respuesta = await apiNode.get(`${NOTIFICACIONES_URL}/contador`);
  return respuesta.data.noLeidas;
};

export const marcarLeida = async (id) => {
  const respuesta = await apiNode.patch(`${NOTIFICACIONES_URL}/${id}/leida`);
  return respuesta.data;
};

export const marcarTodasLeidas = async () => {
  const respuesta = await apiNode.patch(`${NOTIFICACIONES_URL}/leer-todas`);
  return respuesta.data;
};

export const revisarCobros = async () => {
  const respuesta = await apiNode.post(`${NOTIFICACIONES_URL}/revisar`);
  return respuesta.data;
};
