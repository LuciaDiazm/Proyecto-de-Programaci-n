import { Paquete } from '../models/Paquete.js';

export const crearPaquete = async (req, res) => {
    try {
        const { nombre, planes } = req.body;
        const paquete = await Paquete.create({ nombre, planes, usuario: req.usuario.id });
        res.status(201).json(paquete);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear el paquete', detalle: error.message });
    }
};

// D. Populate anidado: paquete -> planes -> proveedor de cada plan
export const obtenerPaquetes = async (req, res) => {
    try {
        const paquetes = await Paquete.find({ usuario: req.usuario.id })
            .populate({
                path: 'planes',
                populate: {
                    path: 'proveedor',
                    select: 'razonSocial'
                }
            });
        res.status(200).json(paquetes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

export const eliminarPaquete = async (req, res) => {
    try {
        const paquete = await Paquete.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id });
        if (!paquete) {
            return res.status(404).json({ mensaje: 'Paquete no encontrado' });
        }
        res.status(200).json({ mensaje: 'Paquete eliminado' });
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al eliminar' });
    }
};
