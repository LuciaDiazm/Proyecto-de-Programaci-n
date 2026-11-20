import { useEffect } from 'react';
import { IconoCerrar } from './Iconos';

export default function Modal({ titulo, alCerrar, children }) {
  // Con la tecla Escape también se cierra
  useEffect(() => {
    const conTecla = (e) => {
      if (e.key === 'Escape') alCerrar();
    };
    document.addEventListener('keydown', conTecla);
    return () => document.removeEventListener('keydown', conTecla);
  }, [alCerrar]);

  const clicEnElFondo = (e) => {
    if (e.target === e.currentTarget) alCerrar();
  };

  return (
    <div className="modal-fondo" onMouseDown={clicEnElFondo}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div className="modal__cabecera">
          <h2 id="modal-titulo">{titulo}</h2>
          <button className="boton-icono" onClick={alCerrar} aria-label="Cerrar">
            <IconoCerrar />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
