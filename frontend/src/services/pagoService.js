import { apiDjango, resultados } from './api';

export const obtenerPagos = async () => {
  const respuesta = await apiDjango.get('/api/pagos/', { params: { page_size: 100 } });
  return resultados(respuesta.data);
};

export const obtenerPagosPorMes = async (meses = 6) => {
  const respuesta = await apiDjango.get('/api/pagos/por-mes/', { params: { meses } });
  return respuesta.data;
};
