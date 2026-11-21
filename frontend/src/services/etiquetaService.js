import { apiDjango, resultados } from './api';

const ETIQUETAS_URL = '/api/etiquetas/';

export const obtenerEtiquetas = async () => {
  const respuesta = await apiDjango.get(ETIQUETAS_URL);
  return resultados(respuesta.data);
};

export const crearEtiqueta = async (datos) => {
  const respuesta = await apiDjango.post(ETIQUETAS_URL, datos);
  return respuesta.data;
};

export const eliminarEtiqueta = async (id) => {
  const respuesta = await apiDjango.delete(`${ETIQUETAS_URL}${id}/`);
  return respuesta.data;
};