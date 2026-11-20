import { apiDjango, resultados } from './api';

export const pagoService = {
  listar: async () => resultados((await apiDjango.get('/api/pagos/', { params: { page_size: 100 } })).data),
  porMes: async (meses = 6) => (await apiDjango.get('/api/pagos/por-mes/', { params: { meses } })).data,
};
