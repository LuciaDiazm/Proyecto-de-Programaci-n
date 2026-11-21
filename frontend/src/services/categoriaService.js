import { apiDjango, resultados } from './api';

const CATEGORIAS_URL = '/api/categorias/';

export const obtenerCategorias = async () => {
  const respuesta = await apiDjango.get(CATEGORIAS_URL);
  return resultados(respuesta.data);
};

export const crearCategoria = async (datos) => {
  const respuesta = await apiDjango.post(CATEGORIAS_URL, datos);
  return respuesta.data;
};

export const actualizarCategoria = async (id, datos) => {
  const respuesta = await apiDjango.patch(`${CATEGORIAS_URL}${id}/`, datos);
  return respuesta.data;
};

export const eliminarCategoria = async (id) => {
  const respuesta = await apiDjango.delete(`${CATEGORIAS_URL}${id}/`);
  return respuesta.data;
};
