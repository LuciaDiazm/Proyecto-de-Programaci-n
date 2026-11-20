import { apiDjango, resultados } from './api';

const GRUPOS_URL = '/api/grupos/';

export const obtenerGrupos = async () => {
  const respuesta = await apiDjango.get(GRUPOS_URL, { params: { page_size: 100 } });
  return resultados(respuesta.data);
};

export const obtenerGrupo = async (id) => {
  const respuesta = await apiDjango.get(`${GRUPOS_URL}${id}/`);
  return respuesta.data;
};

export const crearGrupo = async (datos) => {
  const respuesta = await apiDjango.post(GRUPOS_URL, datos);
  return respuesta.data;
};

export const obtenerResumenGrupo = async (id) => {
  const respuesta = await apiDjango.get(`${GRUPOS_URL}${id}/summary/`);
  return respuesta.data;
};

export const agregarMiembro = async (id, datos) => {
  const respuesta = await apiDjango.post(`${GRUPOS_URL}${id}/add-member/`, datos);
  return respuesta.data;
};
