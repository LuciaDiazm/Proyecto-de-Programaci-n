import { apiDjango, resultados } from './api';

const SUSCRIPCIONES_URL = '/api/suscripciones/';
const POR_PAGINA = 100;

export const obtenerSuscripciones = async (incluirCanceladas = false) => {
  const params = { solo_propias: true, page_size: POR_PAGINA };
  if (incluirCanceladas) params.incluir_canceladas = true;
  const respuesta = await apiDjango.get(SUSCRIPCIONES_URL, { params });
  return resultados(respuesta.data);
};

export const obtenerSuscripcionesDeGrupo = async (grupoId) => {
  const respuesta = await apiDjango.get(SUSCRIPCIONES_URL, { params: { grupo: grupoId, page_size: POR_PAGINA } });
  return resultados(respuesta.data);
};

export const obtenerSuscripcion = async (id) => {
  const respuesta = await apiDjango.get(`${SUSCRIPCIONES_URL}${id}/`);
  return respuesta.data;
};

export const crearSuscripcion = async (datos) => {
  const respuesta = await apiDjango.post(SUSCRIPCIONES_URL, datos);
  return respuesta.data;
};

export const actualizarSuscripcion = async (id, datos) => {
  const respuesta = await apiDjango.patch(`${SUSCRIPCIONES_URL}${id}/`, datos);
  return respuesta.data;
};

export const cancelarSuscripcion = async (id) => {
  const respuesta = await apiDjango.delete(`${SUSCRIPCIONES_URL}${id}/`);
  return respuesta.data;
};

export const obtenerResumen = async () => {
  const respuesta = await apiDjango.get(`${SUSCRIPCIONES_URL}resumen/`);
  return respuesta.data;
};

export const registrarPago = async (id, datos) => {
  const respuesta = await apiDjango.post(`${SUSCRIPCIONES_URL}${id}/registrar-pago/`, datos);
  return respuesta.data;
};

export const obtenerPagosDeSuscripcion = async (id) => {
  const respuesta = await apiDjango.get(`${SUSCRIPCIONES_URL}${id}/pagos/`);
  return resultados(respuesta.data);
};
