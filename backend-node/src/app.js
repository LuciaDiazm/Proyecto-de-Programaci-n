// Configuración de Express, sin levantar el servidor: así Supertest la usa directamente (Módulo 4).
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { obtenerOrigenesPermitidos } from './config/cors.js';
import { ErrorApi } from './utils/errores.js';
import { formatoError } from './middlewares/formatoError.middleware.js';
import { limitadorGlobal } from './middlewares/rateLimit.middleware.js';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import proveedoresRoutes from './routes/proveedores.routes.js';
import planesRoutes from './routes/planes.routes.js';
import paquetesRoutes from './routes/paquetes.routes.js';
import historialRoutes from './routes/historial.routes.js';
import notificacionesRoutes from './routes/notificaciones.routes.js';
import cotizacionRoutes from './routes/cotizacion.routes.js';
import iaRoutes from './routes/ia.routes.js';

const app = express();

// Middlewares globales
// Oculta y protege los headers HTTP
app.use(helmet());

app.use(cors({
    origin: function (origen, callback) {
        if (!origen || obtenerOrigenesPermitidos().includes(origen)) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por politicas CORS'));
        }
    }
}));

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

app.use(formatoError); // Todas las respuestas de error salen con { error: true, mensaje }
app.use(limitadorGlobal);
app.use(express.json({ limit: '10kb' })); // Evita que nos manden cuerpos gigantes

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'Al Día - API Node' });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/planes', planesRoutes);
app.use('/api/paquetes', paquetesRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/cotizacion', cotizacionRoutes);
app.use('/api/ia', iaRoutes);

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// Manejador de errores general (Express 5 captura también los errores de funciones async)
app.use((error, req, res, next) => {
    if (error instanceof ErrorApi) {
        return res.status(error.status).json({ mensaje: error.message });
    }
    if (error.message === 'Bloqueado por politicas CORS') {
        return res.status(403).json({ mensaje: error.message });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El cuerpo de la petición no es un JSON válido' });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
});

export default app;
