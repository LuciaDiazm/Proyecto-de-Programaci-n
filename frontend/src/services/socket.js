// Módulo 4: conexión Socket.IO con la API de Node para recibir avisos al instante.
import { io } from 'socket.io-client';
import { NODE_URL } from './api';

export const conectarNotificaciones = ({ alConectar, alRecibir }) => {
  const socket = io(NODE_URL, {
    // El servidor valida el mismo token que usan las peticiones
    auth: { token: localStorage.getItem('token') },
  });

  socket.on('connect', alConectar); // Al (re)conectar se actualiza el contador
  socket.on('notificacion:nueva', alRecibir);

  return () => {
    socket.off('connect', alConectar);
    socket.off('notificacion:nueva', alRecibir);
    socket.disconnect();
  };
};
