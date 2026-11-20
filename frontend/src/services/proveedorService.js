import { apiNode } from './api';

// Módulo 5: un servicio por entidad, los componentes nunca escriben URLs
const proveedorService = {
  obtenerTodos: async () => {
    const respuesta = await apiNode.get('/api/proveedores');
    return respuesta.data;
  },
  crear: async (datos) => {
    const respuesta = await apiNode.post('/api/proveedores', datos);
    return respuesta.data;
  },
  actualizar: async (id, datos) => {
    const respuesta = await apiNode.put(`/api/proveedores/${id}`, datos);
    return respuesta.data;
  },
  calificar: async (id, calificacion) => {
    const respuesta = await apiNode.patch(`/api/proveedores/${id}/calificar`, { calificacion });
    return respuesta.data;
  },
  eliminar: async (id) => {
    const respuesta = await apiNode.delete(`/api/proveedores/${id}`);
    return respuesta.data;
  },
};

export default proveedorService;
