import request from 'supertest';
import { jest } from '@jest/globals';
import { bearer, ID_PROVEEDOR } from './helpers.js';

// Los mocks se arman una sola vez y los usan la prueba y los controladores
const Plan = { find: jest.fn() };
const Paquete = { find: jest.fn() };
const Proveedor = { exists: jest.fn() };
jest.unstable_mockModule('../src/models/Plan.js', () => ({ Plan }));
jest.unstable_mockModule('../src/models/Paquete.js', () => ({ Paquete }));
jest.unstable_mockModule('../src/models/Proveedor.js', () => ({ Proveedor }));

const { default: app } = await import('../src/app.js');

// Simula la cadena find().populate().populate() y guarda con qué se llamó
const consultaFalsa = (resultado) => {
    const llamadas = [];
    const cadena = {
        populate: (...argumentos) => {
            llamadas.push(argumentos);
            return cadena;
        },
        then: (resolver) => resolver(resultado)
    };
    return { cadena, llamadas };
};

describe('Relaciones con populate', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('A. básico incrusta el proveedor completo', async () => {
        const { cadena, llamadas } = consultaFalsa([{ nombre: 'Premium' }]);
        Plan.find.mockReturnValue(cadena);
        const respuesta = await request(app).get('/api/planes').set('Authorization', bearer());
        expect(respuesta.status).toBe(200);
        expect(llamadas).toEqual([['proveedor']]);
    });

    it('B. con selección trae solo los campos pedidos', async () => {
        const { cadena, llamadas } = consultaFalsa([]);
        Plan.find.mockReturnValue(cadena);
        await request(app).get('/api/planes/resumen').set('Authorization', bearer());
        expect(llamadas).toEqual([['proveedor', 'razonSocial cuit -_id']]);
    });

    it('C. múltiple resuelve dos referencias', async () => {
        const { cadena, llamadas } = consultaFalsa([]);
        Plan.find.mockReturnValue(cadena);
        await request(app).get('/api/planes/detalle').set('Authorization', bearer());
        expect(llamadas.map(([camino]) => camino)).toEqual(['proveedor', 'creadoPor']);
    });

    it('D. anidado llega al proveedor de cada plan del paquete', async () => {
        const { cadena, llamadas } = consultaFalsa([]);
        Paquete.find.mockReturnValue(cadena);
        await request(app).get('/api/paquetes').set('Authorization', bearer());
        expect(llamadas[0][0].populate.path).toBe('proveedor');
    });

    it('No se crea un plan de un proveedor inexistente (Status 404)', async () => {
        Proveedor.exists.mockResolvedValue(null);
        const respuesta = await request(app)
            .post('/api/planes')
            .set('Authorization', bearer())
            .send({ nombre: 'Premium', precio: 100, proveedor: ID_PROVEEDOR });
        expect(respuesta.status).toBe(404);
    });
});