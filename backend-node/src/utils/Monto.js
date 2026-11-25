// Módulo 1: clases, herencia, propiedades privadas (#) y getters/setters.

export class Monto {
    #valor; // Propiedad totalmente privada: solo se accede con el getter y el setter

    constructor(valor, moneda = 'ARS') {
        this.moneda = moneda;
        this.valor = valor; // Pasa por el setter, que valida
    }

    get valor() {
        return this.#valor;
    }

    set valor(nuevoValor) {
        const numero = Number(nuevoValor);
        if (!Number.isFinite(numero) || numero < 0) {
            throw new RangeError('El monto debe ser un número positivo');
        }
        this.#valor = numero;
    }

    get simbolo() {
        return this.moneda === 'USD' ? 'US$' : '$';
    }

    get formateado() {
        const decimales = Number.isInteger(this.#valor) ? 0 : 2;
        const texto = this.#valor.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: 2 });
        return `${this.simbolo} ${texto}`;
    }
}

export class CambioDePrecio extends Monto {
    #anterior;

    constructor(valorNuevo, moneda, valorAnterior, monedaAnterior = moneda) {
        super(valorNuevo, moneda); // Ejecuta el constructor de la clase padre
        this.#anterior = valorAnterior === null || valorAnterior === undefined
            ? null
            : new Monto(valorAnterior, monedaAnterior);
    }

    get esAlta() {
        return this.#anterior === null;
    }

    get anterior() {
        return this.#anterior;
    }

    // null cuando es el alta o cuando cambió la moneda: no se pueden comparar
    get variacionPorcentual() {
        if (this.esAlta || this.#anterior.moneda !== this.moneda || this.#anterior.valor <= 0) {
            return null;
        }
        return Math.round(((this.valor - this.#anterior.valor) / this.#anterior.valor) * 10000) / 100;
    }
}
