// Módulo 4: conexión Socket.IO con la API de Node para recibir avisos al instante.
import { io } from 'socket.io-client';
import { NODE_URL, obtenerTokenVigente } from './api';

export const conectarNotificaciones = ({ alConectar, alRecibir }) => {
  const socket = io(NODE_URL, {
    // Es una función para que cada reconexión use un token vigente
    auth: (responder) => {
      obtenerTokenVigente()
        .then((token) => responder({ token }))
        .catch(() => responder({}));
    },
  });

  socket.on('connect', alConectar); // Al (re)conectar se resincroniza el contador
  socket.on('notificacion:nueva', alRecibir);

  return () => {
    socket.off('connect', alConectar);
    socket.off('notificacion:nueva', alRecibir);
    socket.disconnect();
  };
};
