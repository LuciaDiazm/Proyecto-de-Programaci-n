import mongoose from 'mongoose';

// El resultado de la IA no tiene una estructura 100% fija: por eso se guarda en
// MongoDB con un campo flexible (Mixed). Es un buen ejemplo de por qué usar NoSQL.
const analisisIASchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        index: true
    },
    cantidadSuscripciones: Number,
    cotizacionUsada: Number,
    resultado: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, {
    timestamps: true
});

export const AnalisisIA = mongoose.model('AnalisisIA', analisisIASchema);
