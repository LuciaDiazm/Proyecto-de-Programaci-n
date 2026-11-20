import { useEffect } from 'react';

// Mensaje corto que aparece abajo y se va solo a los 3,5 segundos.
// La página que lo usa guarda el mensaje en su propio estado y lo borra con alCerrar.
export default function Toast({ mensaje, tipo = 'ok', alCerrar }) {
  useEffect(() => {
    const temporizador = setTimeout(alCerrar, 3500);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  return (
    <div className={`toast toast--${tipo}`} role="status">
      {mensaje}
    </div>
  );
}
