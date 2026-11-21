import { Notificacion } from '../models/Notificacion.js';
import { revisarCobros } from '../services/revisorCobros.service.js';

export const obtenerNotificaciones = async (req, res) => {
    try {
        const filtro = { usuario: req.usuario.id };
        if (req.query.noLeidas === 'true') {
            filtro.leida = false;
        }

        const notificaciones = await Notificacion.find(filtro)
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json(notificaciones);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

export const contarNoLeidas = async (req, res) => {
    try {
        const cantidad = await Notificacion.countDocuments({ usuario: req.usuario.id, leida: false });
        res.status(200).json({ noLeidas: cantidad });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

export const marcarComoLeida = async (req, res) => {
    try {
        // Se filtra también por usuario: nadie puede marcar notificaciones ajenas
        const notificacion = await Notificacion.findOneAndUpdate(
            { _id: req.params.id, usuario: req.usuario.id },
            { leida: true },
            { new: true }
        );

        if (!notificacion) {
            return res.status(404).json({ mensaje: 'Notificacion no encontrada' });
        }

        res.status(200).json(notificacion);
    } catch (error) {
        res.status(400).json({ mensaje: 'ID invalido', detalle: error.message });
    }
};

export const marcarTodasComoLeidas = async (req, res) => {
    try {
        const resultado = await Notificacion.updateMany(
            { usuario: req.usuario.id, leida: false },
            { leida: true }
        );
        res.status(200).json({ actualizadas: resultado.modifiedCount });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

// Solo ADMIN: fuerza la revisión de cobros sin esperar al intervalo automático
export const ejecutarRevision = async (req, res) => {
    try {
        const resultado = await revisarCobros();
        res.status(200).json({ mensaje: 'Revision ejecutada', ...resultado });
    } catch (error) {
        res.status(502).json({ mensaje: 'No se pudo consultar la API de Django', detalle: error.message });
    }
};
