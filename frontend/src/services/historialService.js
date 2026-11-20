import { apiNode } from './api';

export const historialService = {
  deSuscripcion: async (id) => (await apiNode.get(`/api/historial/${id}`)).data,
  aumentos: async () => (await apiNode.get('/api/historial/aumentos')).data,
};
