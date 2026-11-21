import { obtenerCotizacion } from '../services/cotizacion.service.js';

export const consultarCotizacion = async (req, res) => {
    try {
        const cotizacion = await obtenerCotizacion();

        res.status(200).json({
            mensaje: 'Cotizacion del dolar obtenida de dolarapi.com',
            ...cotizacion
        });

    } catch (error) {
        res.status(502).json({ mensaje: 'Bad Gateway: Error al comunicarse con el servidor externo' });
    }
};
