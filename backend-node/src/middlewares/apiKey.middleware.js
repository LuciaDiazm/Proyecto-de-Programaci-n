import crypto from 'crypto';

// Protege las rutas que solo usa Django (comunicación servidor a servidor).
// timingSafeEqual compara en tiempo constante para no dar pistas sobre la clave.
export const verificarApiKey = (req, res, next) => {
    const claveRecibida = Buffer.from(req.headers['x-api-key'] || '');
    const claveEsperada = Buffer.from(process.env.API_KEY_INTERNA || '');

    const esValida = claveEsperada.length > 0
        && claveRecibida.length === claveEsperada.length
        && crypto.timingSafeEqual(claveRecibida, claveEsperada);

    if (!esValida) {
        return res.status(403).json({ mensaje: "Clave interna invalida" });
    }

    next();
};
