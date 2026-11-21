import { CambioDePrecio, Monto } from '../src/utils/Monto.js';
import { ErrorApi, ErrorServicioExterno } from '../src/utils/errores.js';

describe('Clases de dominio', () => {
    it('El setter valida y el getter formatea', () => {
        const monto = new Monto(1500);
        expect(monto.valor).toBe(1500);
        expect(monto.formateado).toBe('$ 1.500');
        expect(() => { monto.valor = -1; }).toThrow(RangeError);
    });

    it('Calcula la variación porcentual', () => {
        expect(new CambioDePrecio(150, 'ARS', 100).variacionPorcentual).toBe(50);
    });

    it('Un alta o un cambio de moneda no tienen variación', () => {
        expect(new CambioDePrecio(150, 'ARS', null).variacionPorcentual).toBeNull();
        expect(new CambioDePrecio(5, 'USD', 100, 'ARS').variacionPorcentual).toBeNull();
    });

    it('Los errores propios llevan su código HTTP', () => {
        const error = new ErrorServicioExterno('Django');
        expect(error).toBeInstanceOf(ErrorApi);
        expect(error.status).toBe(502);
    });
});
