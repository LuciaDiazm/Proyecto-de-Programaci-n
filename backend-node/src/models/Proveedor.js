import mongoose from 'mongoose';

// Módulo 2: empresas que ofrecen servicios por suscripción (Netflix, Telecom, Spotify...).
const proveedorSchema = new mongoose.Schema({
    razonSocial: {
        type: String,
        required: [true, 'La razón social es obligatoria'],
        trim: true,
        uppercase: true
    },
    contacto: {
        email: {
            type: String,
            required: [true, 'El email de contacto es obligatorio'],
            lowercase: true
        },
        telefono: String,
        // Página donde se puede hacer un reclamo (opcional)
        urlReclamos: {
            type: String,
            match: [/^https?:\/\//, 'La URL de reclamos tiene que empezar con http:// o https://']
        }
    },
    categorias: [{
        type: String,
        enum: ['STREAMING', 'SOFTWARE', 'TELEFONIA', 'SERVICIOS', 'OTROS']
    }],
    calificacion: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    activo: {
        type: Boolean,
        default: true // El borrado es lógico: se marca como inactivo
    }
}, {
    timestamps: true
});

export const Proveedor = mongoose.model('Proveedor', proveedorSchema);
