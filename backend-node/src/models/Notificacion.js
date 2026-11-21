import mongoose from 'mongoose';

const notificacionSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    tipo: {
        type: String,
        enum: ['COBRO_PROXIMO', 'COBRO_HOY', 'COBRO_ATRASADO', 'AUMENTO'],
        required: true
    },
    titulo: {
        type: String,
        required: true
    },
    mensaje: {
        type: String,
        required: true
    },
    suscripcionId: Number,
    fechaCobro: String, // Formato AAAA-MM-DD, igual que en Django
    // Clave única para no repetir el mismo aviso (ej: "12-COBRO_HOY-2026-10-15")
    clave: {
        type: String,
        required: true
    },
    leida: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Un mismo usuario no puede tener dos notificaciones con la misma clave
notificacionSchema.index({ usuario: 1, clave: 1 }, { unique: true });
notificacionSchema.index({ usuario: 1, createdAt: -1 });

export const Notificacion = mongoose.model('Notificacion', notificacionSchema);
