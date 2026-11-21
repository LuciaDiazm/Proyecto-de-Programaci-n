import rateLimit from "express-rate-limit";

export const limitadorGlobal = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
        mensaje: "Has superado el limite de peticiones. Intenta nuevamente en 15 minutos"
    }
});

export const limitadorLogin = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, // Solo cuentan los intentos fallidos
    message: {
        mensaje: "Demasiados intentos fallidos de inicio de sesion. Intente nuevamente en 1 hora"
    }
});

export const limitadorRegistro = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        mensaje: "Demasiados registros desde esta conexion. Intente mas tarde"
    }
});

// La IA tiene costo: se limita a pocas consultas por hora
export const limitadorIA = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        mensaje: "Alcanzaste el limite de analisis con IA. Intenta nuevamente en 1 hora"
    }
});
