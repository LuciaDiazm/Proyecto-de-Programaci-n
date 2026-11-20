import { useState } from 'react';
import { categoriaService } from '../services/categoriaService';
import { useDatos } from '../context/DatosContext';

// Solo para ADMIN (Django también lo verifica con el rol del token)
export default function Categorias() {
  const { categorias, recargarCategorias, mostrarToast } = useDatos();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#0E6B57');
  const [error, setError] = useState('');

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await categoriaService.crear({ nombre, color });
      setNombre('');
      mostrarToast('Categoría creada');
      recargarCategorias();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiarColor = async (categoria, nuevoColor) => {
    try {
      await categoriaService.actualizar(categoria.id, { color: nuevoColor });
      recargarCategorias();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const borrar = async (categoria) => {
    try {
      await categoriaService.borrar(categoria.id);
      mostrarToast(`${categoria.nombre} borrada`);
      recargarCategorias();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Categorías</h1>
          <p className="texto-suave">Son compartidas por todos los usuarios. Las que están en uso no se pueden borrar.</p>
        </div>
      </header>

      <form className="formulario formulario--linea bloque" onSubmit={crear}>
        <label className="campo">
          <span>Nueva categoría</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Videojuegos" required />
        </label>
        <label className="campo campo--color">
          <span>Color</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <button className="boton boton--primario">Crear categoría</button>
        {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
      </form>

      <ul className="categorias">
        {categorias.map((c) => (
          <li key={c.id}>
            <input
              type="color"
              defaultValue={c.color}
              onBlur={(e) => e.target.value.toUpperCase() !== c.color && cambiarColor(c, e.target.value)}
              aria-label={`Color de ${c.nombre}`}
            />
            <span>{c.nombre}</span>
            <button className="boton boton--chico" onClick={() => borrar(c)}>Borrar</button>
          </li>
        ))}
      </ul>
    </>
  );
}
