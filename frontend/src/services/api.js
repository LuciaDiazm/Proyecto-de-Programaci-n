// Módulo 5: instancia central de Axios. Una sola configuración para toda la app.
// El proyecto tiene dos APIs (Node y Django), así que hay una instancia para cada una.
import axios from 'axios';

export const NODE_URL = import.meta.env.VITE_NODE_URL || 'http://localhost:3000';
export const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8000';
export const WS_URL = DJANGO_URL.replace(/^http/, 'ws');

export const CLAVE_TOKEN = 'aldia_token';
export const CLAVE_REFRESH = 'aldia_refresh';

let alExpirarSesion = null;
export const configurarAlExpirarSesion = (funcion) => {
  alExpirarSesion = funcion;
};

export const guardarSesion = ({ token, refreshToken }) => {
  localStorage.setItem(CLAVE_TOKEN, token);
  if (refreshToken) localStorage.setItem(CLAVE_REFRESH, refreshToken);
};

export const limpiarSesion = () => {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_REFRESH);
};

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

export class ErrorApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

// Node responde { error, mensaje, detalles } y Django responde { error, detail }
function extraerMensaje(cuerpo, status) {
  if (!cuerpo) return `Error de conexión (código ${status})`;

  if (cuerpo.detalles?.length) return cuerpo.detalles[0].msg;
  if (cuerpo.mensaje) return cuerpo.mensaje;

  const detalle = cuerpo.detail;
  if (typeof detalle === 'string') return detalle;
  if (detalle && typeof detalle === 'object') {
    if (typeof detalle.detail === 'string') return detalle.detail;
    const [campo, mensajes] = Object.entries(detalle)[0] || [];
    const texto = Array.isArray(mensajes) ? mensajes[0] : mensajes;
    if (campo === 'non_field_errors') return texto;
    return campo ? `${NOMBRES_CAMPOS[campo] || campo}: ${texto}` : 'Error inesperado';
  }
  return 'Error inesperado';
}

const aErrorApi = (error) => {
  if (!error.response) {
    return new ErrorApi('No se pudo conectar con el servidor. Revisá que las APIs estén encendidas.', 0);
  }
  return new ErrorApi(extraerMensaje(error.response.data, error.response.status), error.response.status);
};

// Si varias peticiones vencen a la vez, todas esperan la misma renovación
let renovacionEnCurso = null;

export const renovarToken = () => {
  if (!renovacionEnCurso) {
    renovacionEnCurso = axios
      .post(`${NODE_URL}/api/auth/refresh`, { refreshToken: localStorage.getItem(CLAVE_REFRESH) })
      .then(({ data }) => {
        guardarSesion(data);
        return data.token;
      })
      .catch((error) => {
        // Solo se cierra la sesión si el servidor rechazó el token, no por un corte de red
        if (error.response?.status === 401 || error.response?.status === 400) {
          limpiarSesion();
          alExpirarSesion?.();
        }
        throw error;
      })
      .finally(() => {
        renovacionEnCurso = null;
      });
  }
  return renovacionEnCurso;
};

// Devuelve un access token que no esté por vencer (lo usan los WebSockets al conectarse)
export const obtenerTokenVigente = async () => {
  const token = localStorage.getItem(CLAVE_TOKEN);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp * 1000 - Date.now() > 30000) return token;
  } catch {
    return token;
  }
  return renovarToken();
};

const RUTAS_DE_CREDENCIALES = ['/api/auth/login', '/api/auth/registro', '/api/auth/refresh'];

const crearCliente = (baseURL) => {
  const cliente = axios.create({ baseURL, timeout: 15000 });

  // Interceptor de petición: adjunta el token en cada request
  cliente.interceptors.request.use((config) => {
    const token = localStorage.getItem(CLAVE_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Interceptor de respuesta: si el access venció, lo renueva y repite la petición una vez
  cliente.interceptors.response.use(
    (respuesta) => respuesta,
    async (error) => {
      const original = error.config;
      const puedeRenovar =
        error.response?.status === 401 &&
        original &&
        !original.reintentado &&
        localStorage.getItem(CLAVE_REFRESH) &&
        !RUTAS_DE_CREDENCIALES.includes(original.url);

      if (puedeRenovar) {
        original.reintentado = true;
        try {
          await renovarToken();
        } catch {
          return Promise.reject(aErrorApi(error));
        }
        return cliente(original);
      }

      return Promise.reject(aErrorApi(error));
    }
  );

  return cliente;
};

export const apiNode = crearCliente(NODE_URL);
export const apiDjango = crearCliente(DJANGO_URL);

// Las listas de Django vienen paginadas: { count, next, previous, results }
export const resultados = (data) => data?.results ?? data;
