import { HistorialPrecio } from '../models/HistorialPrecio.js';
import { Notificacion } from '../models/Notificacion.js';
import { emitirAUsuario } from '../sockets/index.js';
import { CambioDePrecio, Monto } from '../utils/Monto.js';

// La llama Django (con API key) cuando se crea una suscripción o cambia su precio
export const registrarPrecio = async (req, res) => {
    try {
        const { usuarioId, suscripcionId, nombreSuscripcion, precioAnterior, monedaAnterior, precioNuevo, moneda } = req.body;

        const cambio = new CambioDePrecio(precioNuevo, moneda, precioAnterior, monedaAnterior || moneda);
        const { esAlta, variacionPorcentual } = cambio;

        const registro = await HistorialPrecio.create({
            usuario: usuarioId,
            suscripcionId,
            nombreSuscripcion,
            tipo: esAlta ? 'ALTA' : 'CAMBIO',
            precioAnterior: esAlta ? null : precioAnterior,
            monedaAnterior: esAlta ? null : (monedaAnterior || moneda),
            precioNuevo,
            moneda,
            variacionPorcentual
        });

        // Si fue un aumento, además se le avisa al usuario
        if (variacionPorcentual !== null && variacionPorcentual > 0) {
            const porcentaje = new Monto(variacionPorcentual).valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
            const notificacion = await Notificacion.create({
                usuario: usuarioId,
                tipo: 'AUMENTO',
                titulo: `${nombreSuscripcion} aumentó ${porcentaje}%`,
                mensaje: `Pasó de ${cambio.anterior.formateado} a ${cambio.formateado}.`,
                suscripcionId,
                clave: `aumento-${registro._id}`
            });
            emitirAUsuario(usuarioId, 'notificacion:nueva', {
                titulo: notificacion.titulo,
                mensaje: notificacion.mensaje,
                tipo: notificacion.tipo
            });
        }

        res.status(201).json(registro);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al registrar el precio', detalle: error.message });
    }
};

// Evolución del precio de una suscripción del usuario logueado
export const obtenerHistorialDeSuscripcion = async (req, res) => {
    try {
        const historial = await HistorialPrecio.find({
            usuario: req.usuario.id,
            suscripcionId: req.params.suscripcionId
        }).sort({ createdAt: 1 });

        res.status(200).json(historial);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

// Últimos aumentos del usuario (para el panel principal)
export const obtenerUltimosAumentos = async (req, res) => {
    try {
        const limite = Math.min(Number(req.query.limite) || 5, 20);
        const aumentos = await HistorialPrecio.find({
            usuario: req.usuario.id,
            tipo: 'CAMBIO',
            variacionPorcentual: { $gt: 0 }
        })
            .sort({ createdAt: -1 })
            .limit(limite);

        res.status(200).json(aumentos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};
