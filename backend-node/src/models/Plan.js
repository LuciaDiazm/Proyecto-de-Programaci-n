import mongoose from 'mongoose';

// Módulo 2 (relaciones): cada plan pertenece a un proveedor y lo cargó un usuario.
const planSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    precio: {
        type: Number,
        required: [true, 'El precio es obligatorio'],
        min: [0, 'El precio no puede ser negativo']
    },
    moneda: {
        type: String,
        enum: ['ARS', 'USD'],
        default: 'ARS'
    },
    proveedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proveedor',
        required: [true, 'El plan debe pertenecer a un proveedor']
    },
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export const Plan = mongoose.model('Plan', planSchema);
