import { apiNode } from './api';

export const notificacionService = {
  listar: async () => (await apiNode.get('/api/notificaciones')).data,
  contador: async () => (await apiNode.get('/api/notificaciones/contador')).data,
  marcarLeida: async (id) => (await apiNode.patch(`/api/notificaciones/${id}/leida`)).data,
  marcarTodas: async () => (await apiNode.patch('/api/notificaciones/leer-todas')).data,
  revisar: async () => (await apiNode.post('/api/notificaciones/revisar')).data,
};
