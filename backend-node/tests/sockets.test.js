import { createServer } from 'http';
import { io as clienteSocket } from 'socket.io-client';
import { ID_USUARIO, tokenDe } from './helpers.js';
import { emitirAUsuario, inicializarSockets } from '../src/sockets/index.js';

describe('Socket.IO', () => {
    let httpServer;
    let servidor;
    let url;

    beforeAll(async () => {
        httpServer = createServer();
        servidor = inicializarSockets(httpServer);
        await new Promise((listo) => httpServer.listen(0, listo));
        url = `http://localhost:${httpServer.address().port}`;
    });

    afterAll(async () => {
        await servidor.close();
    });

    it('Rechaza la conexión sin token', async () => {
        const cliente = clienteSocket(url, { reconnection: false });
        const error = await new Promise((resolver) => cliente.on('connect_error', resolver));
        expect(error.message).toBe('Token invalido');
        cliente.close();
    });

    it('El aviso le llega solo al usuario indicado', async () => {
        const cliente = clienteSocket(url, { auth: { token: tokenDe() }, reconnection: false });
        await new Promise((listo) => cliente.on('connect', listo));

        const recibido = new Promise((resolver) => cliente.on('notificacion:nueva', resolver));
        emitirAUsuario(ID_USUARIO, 'notificacion:nueva', { titulo: 'Hoy se cobra Netflix' });

        await expect(recibido).resolves.toEqual({ titulo: 'Hoy se cobra Netflix' });
        cliente.close();
    });
});
