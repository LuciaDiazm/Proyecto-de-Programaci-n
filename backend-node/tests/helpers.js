import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'clave-de-prueba-0123456789-abcdefghijklmnop';
process.env.JWT_ISSUER = 'aldia-auth';
process.env.JWT_EXPIRATION = '1h';
process.env.API_KEY_INTERNA = 'clave-interna-de-prueba';

export const ID_USUARIO = '65f1a0000000000000000001';
export const ID_PROVEEDOR = '65f1a0000000000000000099';

export const tokenDe = (rol = 'USUARIO', opciones = {}) => jwt.sign(
    { id: ID_USUARIO, rol, nombre: 'Prueba' },
    process.env.JWT_SECRET,
    { expiresIn: '1h', issuer: 'aldia-auth', ...opciones }
);

export const bearer = (rol) => `Bearer ${tokenDe(rol)}`;
