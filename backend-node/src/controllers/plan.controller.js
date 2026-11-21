import { Plan } from '../models/Plan.js';
import { Proveedor } from '../models/Proveedor.js';

const MENSAJE_500 = 'Error en el servidor';

export const crearPlan = async (req, res) => {
    try {
        const { nombre, precio, moneda, proveedor } = req.body;

        const proveedorExiste = await Proveedor.exists({ _id: proveedor, activo: true });
        if (!proveedorExiste) {
            return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        }

        const plan = await Plan.create({ nombre, precio, moneda, proveedor, creadoPor: req.usuario.id });
        res.status(201).json(plan);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear el plan', detalle: error.message });
    }
};

// A. Populate básico: incrusta el proveedor completo
export const obtenerPlanes = async (req, res) => {
    try {
        const planes = await Plan.find({ activo: true }).populate('proveedor');
        res.status(200).json(planes);
    } catch (error) {
        res.status(500).json({ mensaje: MENSAJE_500 });
    }
};

// B. Populate con selección de campos: solo lo que hace falta mostrar
export const obtenerPlanesResumidos = async (req, res) => {
    try {
        const planes = await Plan.find({ activo: true }).populate('proveedor', 'razonSocial cuit -_id');
        res.status(200).json(planes);
    } catch (error) {
        res.status(500).json({ mensaje: MENSAJE_500 });
    }
};

// C. Populate múltiple: dos referencias en la misma consulta
export const obtenerPlanesDetallados = async (req, res) => {
    try {
        const planes = await Plan.find({ activo: true })
            .populate('proveedor', 'razonSocial contacto.email')
            .populate('creadoPor', 'nombre email');
        res.status(200).json(planes);
    } catch (error) {
        res.status(500).json({ mensaje: MENSAJE_500 });
    }
};

export const obtenerPlanPorId = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id).populate('proveedor');
        if (!plan) {
            return res.status(404).json({ mensaje: 'Plan no encontrado' });
        }
        res.status(200).json(plan);
    } catch (error) {
        res.status(400).json({ mensaje: 'Formato de ID inválido' });
    }
};

export const actualizarPlan = async (req, res) => {
    try {
        const { nombre, precio, moneda } = req.body;
        const plan = await Plan.findByIdAndUpdate(
            req.params.id,
            { nombre, precio, moneda },
            { new: true, runValidators: true }
        );
        if (!plan) {
            return res.status(404).json({ mensaje: 'Plan no encontrado' });
        }
        res.status(200).json(plan);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al actualizar', detalle: error.message });
    }
};

export const eliminarPlan = async (req, res) => {
    try {
        const plan = await Plan.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
        if (!plan) {
            return res.status(404).json({ mensaje: 'Plan no encontrado' });
        }
        res.status(200).json({ mensaje: 'Plan eliminado' });
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al eliminar' });
    }
};
