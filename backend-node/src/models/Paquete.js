import mongoose from 'mongoose';

// Módulo 2 (populate anidado): un paquete agrupa planes, y cada plan tiene su proveedor.
const paqueteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        index: true
    },
    planes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
    }]
}, {
    timestamps: true
});

export const Paquete = mongoose.model('Paquete', paqueteSchema);
