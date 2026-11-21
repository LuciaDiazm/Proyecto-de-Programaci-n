import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ mensaje: "Acceso denegado. Token no valido" });
        }

        const token = authHeader.split(' ')[1];

        const payloadDecodificado = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: process.env.JWT_ISSUER || 'aldia-auth'
        });

        req.usuario = payloadDecodificado;
        req.token = token; // Se reenvía a Django cuando Node necesita datos del usuario

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: "El token ha expirado. Inicie sesion nuevamente" });
        }
        return res.status(401).json({ mensaje: "Token invalido." });
    }
};
