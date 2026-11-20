import { apiDjango, resultados } from './api';

export const categoriaService = {
  listar: async () => resultados((await apiDjango.get('/api/categorias/')).data),
  crear: async (datos) => (await apiDjango.post('/api/categorias/', datos)).data,
  actualizar: async (id, datos) => (await apiDjango.patch(`/api/categorias/${id}/`, datos)).data,
  borrar: async (id) => (await apiDjango.delete(`/api/categorias/${id}/`)).data,
};
