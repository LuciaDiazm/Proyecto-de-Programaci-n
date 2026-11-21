// Clase 10: WebSocket nativo con reconexión (backoff exponencial + jitter) y resincronización.
export function conectarProyecto({ url, alRecibir, alReconectar, alCambiarEstado }) {
  const ESPERA_INICIAL = 1000;
  const ESPERA_MAXIMA = 30000;

  let socket = null;
  let espera = ESPERA_INICIAL;
  let temporizador = null;
  let cerradoAPropósito = false;
  let yaConecto = false;

  const programarReintento = () => {
    if (alCambiarEstado) alCambiarEstado('reconectando');
    // El jitter evita que todos los clientes reintenten en el mismo instante
    temporizador = setTimeout(abrir, espera + Math.random() * 500);
    espera = Math.min(espera * 2, ESPERA_MAXIMA);
  };

  function abrir() {
    if (cerradoAPropósito) return;
    const token = localStorage.getItem('token');

    socket = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      espera = ESPERA_INICIAL;
      if (alCambiarEstado) alCambiarEstado('conectado');
      // Lo que pasó mientras estuvimos desconectados se recupera por REST
      if (yaConecto && alReconectar) alReconectar();
      yaConecto = true;
    };

    socket.onmessage = (evento) => alRecibir(JSON.parse(evento.data));

    socket.onclose = () => {
      if (!cerradoAPropósito) programarReintento();
    };
  }

  abrir();

  return {
    cerrar() {
      cerradoAPropósito = true;
      clearTimeout(temporizador);
      if (socket) socket.close();
    },
  };
}
