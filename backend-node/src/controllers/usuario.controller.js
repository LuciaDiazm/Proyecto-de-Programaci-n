import { Usuario } from '../models/Usuario.js';

// Solo Django (con API key): para invitar a un grupo a alguien por su email
export const buscarUsuarioPorEmail = async (req, res) => {
    try {
        const usuario = await Usuario.findOne({ email: req.query.email }).select('nombre email');
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        res.status(200).json({ id: usuario._id, nombre: usuario.nombre, email: usuario.email });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};
