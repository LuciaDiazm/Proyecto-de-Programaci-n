import mongoose from 'mongoose';

// Cada vez que se crea una suscripción o cambia su precio en Django,
// se guarda un documento acá. Sirve para ver la evolución de precios (inflación).
const historialPrecioSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        index: true
    },
    suscripcionId: {
        type: Number, // Id de la suscripción en PostgreSQL
        required: true
    },
    nombreSuscripcion: {
        type: String,
        required: true,
        trim: true
    },
    tipo: {
        type: String,
        enum: ['ALTA', 'CAMBIO'],
        required: true
    },
    precioAnterior: {
        type: Number,
        default: null
    },
    monedaAnterior: {
        type: String,
        enum: ['ARS', 'USD', null],
        default: null
    },
    precioNuevo: {
        type: Number,
        required: true,
        min: 0
    },
    moneda: {
        type: String,
        enum: ['ARS', 'USD'],
        required: true
    },
    variacionPorcentual: {
        type: Number,
        default: null // null cuando es el alta o cuando cambió la moneda
    }
}, {
    timestamps: true
});

historialPrecioSchema.index({ usuario: 1, suscripcionId: 1, createdAt: 1 });

export const HistorialPrecio = mongoose.model('HistorialPrecio', historialPrecioSchema);
