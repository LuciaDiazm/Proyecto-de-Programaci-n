import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { ID_USUARIO, tokenDe } from './helpers.js';

// El mock se arma una sola vez y lo usan la prueba y el controlador
const Usuario = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
};
jest.unstable_mockModule('../src/models/Usuario.js', () => ({ Usuario }));

const { default: app } = await import('../src/app.js');

const usuarioFalso = (compararResultado = true) => ({
    _id: ID_USUARIO,
    rol: 'USUARIO',
    nombre: 'Ana',
    compararPassword: async () => compararResultado
});

const conSelect = (valor) => ({ select: async () => valor });

describe('Autenticación', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('Login correcto devuelve el token (Status 200)', async () => {
        Usuario.findOne.mockReturnValue(conSelect(usuarioFalso()));
        const respuesta = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ana@aldia.com', password: 'clave1234' });
        expect(respuesta.status).toBe(200);
        expect(jwt.decode(respuesta.body.token).id).toBe(ID_USUARIO);
    });

    it('Credenciales incorrectas responden 401', async () => {
        Usuario.findOne.mockReturnValue(conSelect(usuarioFalso(false)));
        const respuesta = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ana@aldia.com', password: 'clave1234' });
        expect(respuesta.status).toBe(401);
    });

    it('Datos inválidos responden 400', async () => {
        const respuesta = await request(app).post('/api/auth/registro').send({ email: 'x' });
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.detalles.length).toBeGreaterThan(0);
    });

    it('Un token vencido responde 401', async () => {
        const vencido = tokenDe('USUARIO', { expiresIn: -10 });
        const respuesta = await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${vencido}`);
        expect(respuesta.status).toBe(401);
        expect(respuesta.body.mensaje).toMatch(/expirado/);
    });
});

describe('Ruta interna de usuarios', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('Exige la API key (Status 403)', async () => {
        const respuesta = await request(app).get('/api/usuarios/interno/buscar?email=ana@aldia.com');
        expect(respuesta.status).toBe(403);
    });

    it('Con la API key devuelve el usuario', async () => {
        Usuario.findOne.mockReturnValue(conSelect({ _id: ID_USUARIO, nombre: 'Ana', email: 'ana@aldia.com' }));
        const respuesta = await request(app)
            .get('/api/usuarios/interno/buscar?email=ana@aldia.com')
            .set('X-API-KEY', process.env.API_KEY_INTERNA);
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.id).toBe(ID_USUARIO);
    });
});