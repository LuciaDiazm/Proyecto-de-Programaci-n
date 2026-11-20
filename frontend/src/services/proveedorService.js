import { apiNode } from './api';

// Módulo 5: un servicio por entidad, las páginas nunca escriben URLs
const PROVEEDORES_URL = '/api/proveedores';

export const obtenerProveedores = async () => {
  const respuesta = await apiNode.get(PROVEEDORES_URL);
  return respuesta.data;
};

export const crearProveedor = async (datosNuevo) => {
  const respuesta = await apiNode.post(PROVEEDORES_URL, datosNuevo);
  return respuesta.data;
};

export const actualizarProveedor = async (id, datosActualizados) => {
  const respuesta = await apiNode.put(`${PROVEEDORES_URL}/${id}`, datosActualizados);
  return respuesta.data;
};

export const calificarProveedor = async (id, calificacion) => {
  const respuesta = await apiNode.patch(`${PROVEEDORES_URL}/${id}/calificar`, { calificacion });
  return respuesta.data;
};

export const eliminarProveedor = async (id) => {
  const respuesta = await apiNode.delete(`${PROVEEDORES_URL}/${id}`);
  return respuesta.data;
};
