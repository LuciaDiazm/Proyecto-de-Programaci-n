// Crea un usuario ADMIN (o convierte en ADMIN a uno existente).
// Uso: npm run crear-admin -- admin@aldia.com MiClave123 "Nombre Admin"
import 'dotenv/config';
import mongoose from 'mongoose';
import { conectarBD } from '../config/db.js';
import { Usuario } from '../models/Usuario.js';

const [email, password, nombre = 'Administrador'] = process.argv.slice(2);

if (!email || !password) {
    console.error('Uso: npm run crear-admin -- <email> <password> [nombre]');
    process.exit(1);
}

if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error('La contraseña debe tener al menos 8 caracteres, con letras y numeros');
    process.exit(1);
}

try {
    await conectarBD();

    let usuario = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuario) {
        usuario.rol = 'ADMIN';
        usuario.password = password;
    } else {
        usuario = new Usuario({ nombre, email, password, rol: 'ADMIN' });
    }
    await usuario.save();

    console.log(`Usuario ADMIN listo: ${usuario.email}`);
} catch (error) {
    console.error(`No se pudo crear el admin: ${error.message}`);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
