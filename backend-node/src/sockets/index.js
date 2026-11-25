import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { obtenerOrigenesPermitidos } from '../config/cors.js';

let io = null;

const salaDeUsuario = (id) => `usuario:${id}`;

// Módulo 4: Socket.IO comparte el servidor HTTP de Express
export const inicializarSockets = (httpServer) => {
    io = new Server(httpServer, {
        cors: { origin: obtenerOrigenesPermitidos() } // Configuración CORS exclusiva para WebSockets
    });

    // Igual que verificarToken, pero para la conexión: sin token válido no se entra
    io.use((socket, next) => {
        try {
            const payload = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET, {
                algorithms: ['HS256'],
                issuer: process.env.JWT_ISSUER || 'aldia-auth'
            });
            socket.usuario = payload;
            next();
        } catch {
            next(new Error('Token inválido'));
        }
    });

    io.on('connection', (socket) => {
        // Cada usuario entra a su propia sala: los avisos no le llegan a nadie más
        socket.join(salaDeUsuario(socket.usuario.id));
        console.log(`Nuevo cliente conectado vía WebSocket: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`Cliente desconectado: ${socket.id}`);
        });
    });

    return io;
};

// Si Socket.IO no arrancó (por ejemplo, en los tests) no hace nada
export const emitirAUsuario = (usuarioId, evento, datos) => {
    if (io) {
        io.to(salaDeUsuario(usuarioId)).emit(evento, datos);
    }
};
