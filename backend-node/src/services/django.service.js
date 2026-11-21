// Comunicación de Node hacia la API de Django (PostgreSQL)
import { ErrorServicioExterno } from '../utils/errores.js';

const urlDjango = () => process.env.DJANGO_API_URL || 'http://localhost:8000';

// Ruta interna protegida con API key: todos los cobros próximos (para las notificaciones)
export const obtenerProximosCobros = async (dias = 7) => {
    const respuesta = await fetch(`${urlDjango()}/api/internos/proximos-cobros/?dias=${dias}`, {
        headers: { 'X-API-KEY': process.env.API_KEY_INTERNA || '' },
        signal: AbortSignal.timeout(5000)
    });

    if (!respuesta.ok) {
        throw new ErrorServicioExterno('Django', `status ${respuesta.status}`);
    }

    return await respuesta.json();
};

// Reenvía el token del usuario: Django solo devuelve las suscripciones de ese usuario
export const obtenerSuscripcionesDelUsuario = async (token) => {
    const respuesta = await fetch(`${urlDjango()}/api/suscripciones/?estado=activa&solo_propias=true&page_size=100`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
    });

    if (!respuesta.ok) {
        throw new ErrorServicioExterno('Django', `status ${respuesta.status}`);
    }

    // La lista de Django viene paginada: los datos están en "results"
    return (await respuesta.json()).results;
};
