// Componente "tonto": solo muestra lo que recibe por props y avisa con callbacks
const ESTRELLAS = [1, 2, 3, 4, 5];

export default function ProveedorCard({ item, onEdit, onDelete, onCalificar }) {
  const contacto = item.contacto || {};
  const categorias = item.categorias || [];

  return (
    <article className="tarjeta">
      <h3 className="tarjeta__titulo">{item.razonSocial}</h3>
      {/* El email se muestra como texto para copiarlo; el link lleva a la página de reclamos */}
      <p className="texto-suave">
        {contacto.email}
        {contacto.telefono ? ` · ${contacto.telefono}` : ''}
      </p>
      {contacto.urlReclamos && (
        <p>
          <a href={contacto.urlReclamos} target="_blank" rel="noreferrer">Hacer un reclamo</a>
        </p>
      )}

      {categorias.length > 0 && (
        <ul className="insignias">
          {categorias.map((categoria) => <li key={categoria}>{categoria.toLowerCase()}</li>)}
        </ul>
      )}

      <div className="estrellas" role="group" aria-label={`Calificar a ${item.razonSocial}`}>
        {ESTRELLAS.map((valor) => (
          <button
            key={valor}
            type="button"
            className={`estrella ${item.calificacion >= valor ? 'estrella--activa' : ''}`}
            onClick={() => onCalificar(item._id, valor)}
            aria-label={`${valor} de 5`}
            aria-pressed={item.calificacion === valor}
          >
            ★
          </button>
        ))}
      </div>

      <div className="tarjeta__acciones">
        <button className="boton boton--chico" onClick={() => onEdit(item)}>Editar</button>
        {onDelete && (
          <button className="boton boton--chico boton--peligro" onClick={() => onDelete(item._id)}>Borrar</button>
        )}
      </div>
    </article>
  );
}
