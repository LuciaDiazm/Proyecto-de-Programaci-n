import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
        maxlength: 60
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'El email es obligatorio'],
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false // Nunca se devuelve en las consultas salvo que se pida explícitamente
    },
    rol: {
        type: String,
        enum: ['ADMIN', 'USUARIO'],
        default: 'USUARIO'
    },
    diasAviso: {
        type: Number,
        min: 0,
        max: 30,
        default: 3 // Cuántos días antes del cobro avisar
    }
}, {
    timestamps: true
});

usuarioSchema.pre('save', async function () {

    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(this.password, salt);
});

usuarioSchema.methods.compararPassword = async function (passwordIngresado) {
    return await bcrypt.compare(passwordIngresado, this.password);
};

// Al convertir a JSON se quitan los datos internos
usuarioSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
    }
});

export const Usuario = mongoose.model('Usuario', usuarioSchema);
