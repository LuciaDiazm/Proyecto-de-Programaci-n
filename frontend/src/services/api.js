// Módulo 5: instancia de Axios con un interceptor que agrega el token a cada petición.
// El proyecto tiene dos APIs (Node y Django), así que hay una instancia para cada una.
import axios from 'axios';

export const NODE_URL = import.meta.env.VITE_NODE_URL || 'http://localhost:3000';
export const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8000';
export const WS_URL = DJANGO_URL.replace(/^http/, 'ws');

export const apiNode = axios.create({ baseURL: NODE_URL });
export const apiDjango = axios.create({ baseURL: DJANGO_URL });

// El "aduanero": antes de salir, cada petición recibe el token guardado
const agregarToken = (config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

// Si el token venció, el servidor responde 401: se borra la sesión y se vuelve al login
const revisarSesion = (error) => {
  if (error.response && error.response.status === 401 && localStorage.getItem('token')) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/ingresar';
  }
  return Promise.reject(error);
};

apiNode.interceptors.request.use(agregarToken);
apiDjango.interceptors.request.use(agregarToken);
apiNode.interceptors.response.use((respuesta) => respuesta, revisarSesion);
apiDjango.interceptors.response.use((respuesta) => respuesta, revisarSesion);

// Las listas de Django vienen paginadas: { count, next, previous, results }
export const resultados = (data) => (data && data.results !== undefined ? data.results : data);

const NOMBRES_CAMPOS = {
  nombre: 'Nombre',
  monto: 'Monto',
  dia_cobro: 'Día de cobro',
  fecha_inicio: 'Fecha de inicio',
  categoria: 'Categoría',
  color: 'Color',
  cotizacion: 'Cotización',
  fecha_pago: 'Fecha de pago',
};

// Arma el texto que se muestra en pantalla a partir del error de Axios.
// Node responde { mensaje, detalles } y Django responde { detail } o { campo: [errores] }
export function mensajeError(error) {
  if (!error.response) return 'No se pudo conectar con el servidor. Revisá que las APIs estén encendidas.';

  const cuerpo = error.response.data;
  if (!cuerpo || typeof cuerpo !== 'object') return `Error de conexión (código ${error.response.status})`;
  if (cuerpo.detalles && cuerpo.detalles.length) return cuerpo.detalles[0].msg;
  if (cuerpo.mensaje) return cuerpo.mensaje;

  const detalle = cuerpo.detail || cuerpo;
  if (typeof detalle === 'string') return detalle;
  if (typeof detalle.detail === 'string') return detalle.detail;

  const campos = Object.entries(detalle);
  if (campos.length === 0) return 'Error inesperado';
  const [campo, mensajes] = campos[0];
  const texto = Array.isArray(mensajes) ? mensajes[0] : mensajes;
  if (campo === 'non_field_errors') return texto;
  return `${NOMBRES_CAMPOS[campo] || campo}: ${texto}`;
}
