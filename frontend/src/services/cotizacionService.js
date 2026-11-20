import { apiNode } from './api';

export const cotizacionService = {
  obtener: async () => (await apiNode.get('/api/cotizacion')).data,
};
