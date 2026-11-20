import { apiDjango, resultados } from './api';

export const grupoService = {
  listar: async () => resultados((await apiDjango.get('/api/grupos/', { params: { page_size: 100 } })).data),
  obtener: async (id) => (await apiDjango.get(`/api/grupos/${id}/`)).data,
  crear: async (datos) => (await apiDjango.post('/api/grupos/', datos)).data,
  resumen: async (id) => (await apiDjango.get(`/api/grupos/${id}/summary/`)).data,
  agregarMiembro: async (id, datos) => (await apiDjango.post(`/api/grupos/${id}/add-member/`, datos)).data,
};
