import { useEffect, useRef } from 'react';
import { IconoCerrar } from './Iconos';

export default function Modal({ titulo, alCerrar, children }) {
  const caja = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    caja.current?.querySelector('input, select, textarea, button')?.focus();
    const conTecla = (e) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', conTecla);
    return () => {
      document.removeEventListener('keydown', conTecla);
      anterior?.focus?.();
    };
  }, [alCerrar]);

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" ref={caja}>
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
