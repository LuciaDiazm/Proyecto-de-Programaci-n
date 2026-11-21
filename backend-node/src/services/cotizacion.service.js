// Cotización del dólar desde una API pública (https://dolarapi.com).
// Se guarda en memoria 30 minutos para no consultar la API externa en cada petición.
import { ErrorServicioExterno } from '../utils/errores.js';

const DURACION_CACHE_MS = 30 * 60 * 1000;
let cache = null;
let ultimaConsulta = 0;

const consultarCasa = async (casa) => {
    const respuesta = await fetch(`https://dolarapi.com/v1/dolares/${casa}`, {
        signal: AbortSignal.timeout(5000)
    });

    if (!respuesta.ok) {
        throw new ErrorServicioExterno('dolarapi.com', `status ${respuesta.status}`);
    }

    const datos = await respuesta.json();
    return {
        compra: datos.compra,
        venta: datos.venta,
        fechaActualizacion: datos.fechaActualizacion
    };
};

export const obtenerCotizacion = async () => {
    const cacheVigente = cache && (Date.now() - ultimaConsulta) < DURACION_CACHE_MS;
    if (cacheVigente) {
        return { ...cache, desdeCache: true };
    }

    try {
        // Las dos consultas se hacen en paralelo
        const [tarjeta, oficial] = await Promise.all([consultarCasa('tarjeta'), consultarCasa('oficial')]);
        cache = { tarjeta, oficial, fuente: 'dolarapi.com' };
        ultimaConsulta = Date.now();
        return { ...cache, desdeCache: false };
    } catch (error) {
        // Si la API externa falla pero tenemos un valor anterior, lo usamos igual
        if (cache) {
            return { ...cache, desdeCache: true, desactualizada: true };
        }
        throw error;
    }
};
