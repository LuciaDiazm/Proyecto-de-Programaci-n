import { apiDjango, resultados } from './api';

const POR_PAGINA = 100;

export const suscripcionService = {
  listar: async (incluirCanceladas = false) => {
    const params = { solo_propias: true, page_size: POR_PAGINA };
    if (incluirCanceladas) params.incluir_canceladas = true;
    return resultados((await apiDjango.get('/api/suscripciones/', { params })).data);
  },
  deGrupo: async (grupoId) =>
    resultados((await apiDjango.get('/api/suscripciones/', { params: { grupo: grupoId, page_size: POR_PAGINA } })).data),
  obtener: async (id) => (await apiDjango.get(`/api/suscripciones/${id}/`)).data,
  crear: async (datos) => (await apiDjango.post('/api/suscripciones/', datos)).data,
  actualizar: async (id, datos) => (await apiDjango.patch(`/api/suscripciones/${id}/`, datos)).data,
  cancelar: async (id) => (await apiDjango.delete(`/api/suscripciones/${id}/`)).data,
  resumen: async () => (await apiDjango.get('/api/suscripciones/resumen/')).data,
  proximos: async (dias = 31) =>
    (await apiDjango.get('/api/suscripciones/proximos/', { params: { dias } })).data,
  registrarPago: async (id, datos = {}) =>
    (await apiDjango.post(`/api/suscripciones/${id}/registrar-pago/`, datos)).data,
  pagos: async (id) => resultados((await apiDjango.get(`/api/suscripciones/${id}/pagos/`)).data),
};
