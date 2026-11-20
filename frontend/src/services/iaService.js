import { apiNode } from './api';

export const iaService = {
  // La IA puede tardar bastante más que una petición común
  analizar: async () => (await apiNode.post('/api/ia/analizar', undefined, { timeout: 60000 })).data,
  ultimo: async () => (await apiNode.get('/api/ia/ultimo')).data,
};
