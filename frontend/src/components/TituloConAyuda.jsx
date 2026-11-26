import { useState } from 'react';

// Título de página con un botón "?": al tocarlo muestra u oculta la explicación (children)
export default function TituloConAyuda({ titulo, children }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <h1 className="titulo-ayuda">
        {titulo}
        <button
          type="button"
          className={`ayuda ${abierta ? 'ayuda--abierta' : ''}`}
          aria-label={abierta ? 'Ocultar explicación' : 'Ver explicación'}
          title={abierta ? 'Ocultar explicación' : 'Ver explicación'}
          onClick={() => setAbierta(!abierta)}
        >
          ?
        </button>
      </h1>
      {abierta && <p className="texto-suave ayuda__texto">{children}</p>}
    </>
  );
}
