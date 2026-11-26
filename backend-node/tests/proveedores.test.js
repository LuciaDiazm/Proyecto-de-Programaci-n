import request from 'supertest';
import { jest } from '@jest/globals';
import { bearer, ID_PROVEEDOR } from './helpers.js';

// El controlador hace new Proveedor(...).save(), por eso el mock es una función con prototype.save.
// Se arma una sola vez y lo usan la prueba y el controlador.
const Proveedor = jest.fn();
Proveedor.prototype.save = jest.fn();
Proveedor.find = jest.fn();
Proveedor.findById = jest.fn();
Proveedor.findOne = jest.fn();
Proveedor.findByIdAndUpdate = jest.fn();
jest.unstable_mockModule('../src/models/Proveedor.js', () => ({ Proveedor }));

const { default: app } = await import('../src/app.js');

const DATOS_VALIDOS = {
    razonSocial: 'Netflix Argentina',
    contacto: { email: 'contacto@netflix.com', urlReclamos: 'https://help.netflix.com' },
    categorias: ['STREAMING']
};

describe('Controlador de Proveedores', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    // --- HAPPY PATH (Caminos de Éxito) ---
    it('Debería crear un proveedor exitosamente (Status 201)', async () => {
        Proveedor.prototype.save.mockResolvedValue({ _id: ID_PROVEEDOR, ...DATOS_VALIDOS });
        const respuesta = await request(app)
            .post('/api/proveedores')
            .set('Authorization', bearer())
            .send(DATOS_VALIDOS);
        expect(respuesta.status).toBe(201);
        expect(respuesta.body.razonSocial).toBe('Netflix Argentina');
    });

    it('Debería listar solo los proveedores activos (Status 200)', async () => {
        Proveedor.find.mockResolvedValue([DATOS_VALIDOS]);
        const respuesta = await request(app).get('/api/proveedores').set('Authorization', bearer());
        expect(respuesta.status).toBe(200);
        expect(respuesta.body).toHaveLength(1);
        expect(Proveedor.find).toHaveBeenCalledWith({ activo: true });
    });

    it('Debería actualizar con validaciones activas (Status 200)', async () => {
        Proveedor.findByIdAndUpdate.mockResolvedValue(DATOS_VALIDOS);
        const respuesta = await request(app)
            .put(`/api/proveedores/${ID_PROVEEDOR}`)
            .set('Authorization', bearer())
            .send(DATOS_VALIDOS);
        expect(respuesta.status).toBe(200);
        expect(Proveedor.findByIdAndUpdate.mock.calls[0][2]).toEqual({ new: true, runValidators: true });
    });

    it('Debería calificar un proveedor (Status 200)', async () => {
        Proveedor.findByIdAndUpdate.mockResolvedValue({ ...DATOS_VALIDOS, calificacion: 4 });
        const respuesta = await request(app)
            .patch(`/api/proveedores/${ID_PROVEEDOR}/calificar`)
            .set('Authorization', bearer())
            .send({ calificacion: 4 });
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.calificacion).toBe(4);
    });

    it('El borrado es lógico y lo puede hacer un ADMIN (Status 200)', async () => {
        Proveedor.findByIdAndUpdate.mockResolvedValue(DATOS_VALIDOS);
        const respuesta = await request(app)
            .delete(`/api/proveedores/${ID_PROVEEDOR}`)
            .set('Authorization', bearer('ADMIN'));
        expect(respuesta.status).toBe(200);
        expect(Proveedor.findByIdAndUpdate.mock.calls[0][1]).toEqual({ activo: false });
    });

    // --- SAD PATHS (Caminos de Falla Controlada) ---
    it('Debería devolver 401 sin token', async () => {
        const respuesta = await request(app).get('/api/proveedores');
        expect(respuesta.status).toBe(401);
        expect(respuesta.body.error).toBe(true);
        expect(Proveedor.find).not.toHaveBeenCalled();
    });

    it('Debería devolver 400 si faltan campos obligatorios en el Body', async () => {
        const respuesta = await request(app)
            .post('/api/proveedores')
            .set('Authorization', bearer())
            .send({ categorias: ['STREAMING'] });
        expect(respuesta.status).toBe(400);
        expect(respuesta.body).toHaveProperty('mensaje');
        expect(respuesta.body.error).toBe(true);
    });

    it('Debería devolver 400 si ya hay un proveedor activo con ese nombre', async () => {
        Proveedor.findOne.mockResolvedValue({ _id: 'otro-id', razonSocial: 'NETFLIX ARGENTINA' });
        const respuesta = await request(app)
            .post('/api/proveedores')
            .set('Authorization', bearer())
            .send(DATOS_VALIDOS);
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.mensaje).toBe('Ya existe un proveedor con ese nombre');
        // Busca en mayúsculas porque así se guarda la razón social
        expect(Proveedor.findOne).toHaveBeenCalledWith({ razonSocial: 'NETFLIX ARGENTINA', activo: true });
        expect(Proveedor.prototype.save).not.toHaveBeenCalled();
    });

    it('Al editar, puede conservar su propio nombre (Status 200)', async () => {
        Proveedor.findOne.mockResolvedValue({ _id: ID_PROVEEDOR, razonSocial: 'NETFLIX ARGENTINA' });
        Proveedor.findByIdAndUpdate.mockResolvedValue(DATOS_VALIDOS);
        const respuesta = await request(app)
            .put(`/api/proveedores/${ID_PROVEEDOR}`)
            .set('Authorization', bearer())
            .send(DATOS_VALIDOS);
        expect(respuesta.status).toBe(200);
    });

    it('Debería rechazar una URL de reclamos que no empieza con http (Status 400)', async () => {
        const respuesta = await request(app)
            .post('/api/proveedores')
            .set('Authorization', bearer())
            .send({ ...DATOS_VALIDOS, contacto: { email: 'contacto@netflix.com', urlReclamos: 'netflix.com' } });
        expect(respuesta.status).toBe(400);
        expect(Proveedor.findOne).not.toHaveBeenCalled();
    });

    it('Debería devolver 404 si el proveedor no existe', async () => {
        Proveedor.findById.mockResolvedValue(null);
        const respuesta = await request(app)
            .get(`/api/proveedores/${ID_PROVEEDOR}`)
            .set('Authorization', bearer());
        expect(respuesta.status).toBe(404);
    });

    it('Un usuario común no puede eliminar (Status 403)', async () => {
        const respuesta = await request(app)
            .delete(`/api/proveedores/${ID_PROVEEDOR}`)
            .set('Authorization', bearer('USUARIO'));
        expect(respuesta.status).toBe(403);
    });

    it('Debería rechazar una calificación fuera de rango (Status 400)', async () => {
        const respuesta = await request(app)
            .patch(`/api/proveedores/${ID_PROVEEDOR}/calificar`)
            .set('Authorization', bearer())
            .send({ calificacion: 9 });
        expect(respuesta.status).toBe(400);
    });

    it('Debería devolver 500 si la base de datos colapsa (Manejo de Excepciones)', async () => {
        Proveedor.find.mockRejectedValue(new Error('Fallo crítico de conexión al cluster Atlas'));
        const respuesta = await request(app).get('/api/proveedores').set('Authorization', bearer());
        expect(respuesta.status).toBe(500);
        // El usuario final NO ve el error interno de la base
        expect(respuesta.body).toHaveProperty('mensaje', 'Error en el servidor');
    });
});