import jwt from 'jsonwebtoken';

export const generarAccessToken = (usuario) => jwt.sign(
    { id: usuario._id, rol: usuario.rol, nombre: usuario.nombre },
    process.env.JWT_SECRET,
    {
        expiresIn: process.env.JWT_EXPIRATION,
        issuer: process.env.JWT_ISSUER || 'aldia-auth'
    }
);