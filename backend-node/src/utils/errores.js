// Módulo 1: errores personalizados que extienden la clase nativa Error.
export class ErrorApi extends Error {
    constructor(mensaje, status = 500) {
        super(mensaje);
        this.name = this.constructor.name;
        this.status = status;
    }
}

// La API externa falló: responde 502 Bad Gateway (Módulo 4)
export class ErrorServicioExterno extends ErrorApi {
    constructor(servicio, detalle = '') {
        super(`Error al comunicarse con ${servicio}${detalle ? `: ${detalle}` : ''}`, 502);
        this.servicio = servicio;
    }
}