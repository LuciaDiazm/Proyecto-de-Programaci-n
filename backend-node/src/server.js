// Levanta HTTP y WebSockets sobre el mismo puerto (Módulo 4).
import { createServer } from 'http';
import app from './app.js';
import { conectarBD } from './config/db.js';
import { inicializarSockets } from './sockets/index.js';
import { iniciarPuenteFirebase } from './sockets/firebase.bridge.js';
import { iniciarRevisorCobros } from './services/revisorCobros.service.js';

const PORT = process.env.PORT || 3000;

// Socket.IO necesita el servidor HTTP nativo, no la app de Express
const httpServer = createServer(app);
const io = inicializarSockets(httpServer);

await conectarBD();

httpServer.listen(PORT, () => {
    console.log(`Servidor HTTP y WebSockets listo en http://localhost:${PORT}`);
    iniciarRevisorCobros();
    iniciarPuenteFirebase(io);
});
