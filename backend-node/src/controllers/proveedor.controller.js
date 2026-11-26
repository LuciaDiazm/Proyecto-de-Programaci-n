import { Proveedor } from '../models/Proveedor.js';

const MENSAJE_500 = 'Error en el servidor';

// Se toman solo estos campos: el cliente no puede mandar "activo" ni "calificacion" al crear
const camposEditables = ({ razonSocial, contacto, categorias }) => ({ razonSocial, contacto, categorias });

const MENSAJE_REPETIDO = 'Ya existe un proveedor con ese nombre';

// Para no cargar dos veces el mismo: se busca un activo con el mismo nombre (se guarda en mayúsculas)
const buscarRepetido = async (razonSocial, idPropio) => {
    const existente = await Proveedor.findOne({ razonSocial: razonSocial.trim().toUpperCase(), activo: true });
    if (existente && String(existente._id) !== idPropio) return existente;
    return null;
};

const respuestaErrorDeGuardado = (res, error, mensaje) => {
    return res.status(400).json({ mensaje, detalle: error.message });
};

export const crearProveedor = async (req, res) => {
    try {
        if (await buscarRepetido(req.body.razonSocial)) {
            return res.status(400).json({ mensaje: MENSAJE_REPETIDO });
        }
        const nuevoProveedor = new Proveedor(camposEditables(req.body));
        const proveedorGuardado = await nuevoProveedor.save();
        res.status(201).json(proveedorGuardado);
    } catch (error) {
        respuestaErrorDeGuardado(res, error, 'Error al crear proveedor');
    }
};

export const obtenerProveedores = async (req, res) => {
    try {
        // El borrado es lógico: por defecto solo se listan los activos
        const filtro = req.query.incluirInactivos === 'true' ? {} : { activo: true };
        const proveedores = await Proveedor.find(filtro);
        res.status(200).json(proveedores);
    } catch (error) {
        res.status(500).json({ mensaje: MENSAJE_500 });
    }
};

export const obtenerProveedorPorId = async (req, res) => {
    try {
        const proveedor = await Proveedor.findById(req.params.id);
        if (!proveedor) {
            return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        }
        res.status(200).json(proveedor);
    } catch (error) {
        res.status(400).json({ mensaje: 'Formato de ID inválido' });
    }
};

export const actualizarProveedor = async (req, res) => {
    try {
        if (await buscarRepetido(req.body.razonSocial, req.params.id)) {
            return res.status(400).json({ mensaje: MENSAJE_REPETIDO });
        }
        const proveedorActualizado = await Proveedor.findByIdAndUpdate(
            req.params.id,
            camposEditables(req.body),
            { new: true, runValidators: true }
        );
        if (!proveedorActualizado) {
            return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        }
        res.status(200).json(proveedorActualizado);
    } catch (error) {
        respuestaErrorDeGuardado(res, error, 'Error al actualizar');
    }
};

// Acción del TP de React: "Calificar un proveedor"
export const calificarProveedor = async (req, res) => {
    try {
        const proveedor = await Proveedor.findByIdAndUpdate(
            req.params.id,
            { calificacion: req.body.calificacion },
            { new: true, runValidators: true }
        );
        if (!proveedor) {
            return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        }
        res.status(200).json(proveedor);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al calificar', detalle: error.message });
    }
};

// Borrado lógico: los planes que lo referencian siguen siendo válidos
export const eliminarProveedor = async (req, res) => {
    try {
        const proveedor = await Proveedor.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
        if (!proveedor) {
            return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        }
        res.status(200).json({ mensaje: 'Proveedor eliminado' });
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al eliminar' });
    }
};
