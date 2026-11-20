import { apiNode } from './api';

export const analizarGastos = async () => {
  const respuesta = await apiNode.post('/api/ia/analizar');
  return respuesta.data;
};

export const obtenerUltimoAnalisis = async () => {
  const respuesta = await apiNode.get('/api/ia/ultimo');
  return respuesta.data;
};
