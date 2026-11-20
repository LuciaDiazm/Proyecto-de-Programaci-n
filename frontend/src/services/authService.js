import { apiNode } from './api';

export const authService = {
  login: async (datos) => (await apiNode.post('/api/auth/login', datos)).data,
  registro: async (datos) => (await apiNode.post('/api/auth/registro', datos)).data,
  logout: async (refreshToken) => (await apiNode.post('/api/auth/logout', { refreshToken })).data,
  perfil: async () => (await apiNode.get('/api/auth/perfil')).data,
  actualizarPerfil: async (datos) => (await apiNode.patch('/api/auth/perfil', datos)).data,
};
