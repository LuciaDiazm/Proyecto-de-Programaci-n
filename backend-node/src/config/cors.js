// Whitelist de páginas permitidas (se configura en el .env). La usan Express y Socket.IO.
export const obtenerOrigenesPermitidos = () =>
    (process.env.CORS_ORIGINS || 'http://localhost:5173')
        .split(',')
        .map((origen) => origen.trim());
