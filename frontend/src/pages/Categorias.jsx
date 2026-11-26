import { useEffect, useState } from 'react';
import { actualizarCategoria, crearCategoria, eliminarCategoria, obtenerCategorias } from '../services/categoriaService';
import { mensajeError } from '../services/api';
import Toast from '../components/Toast';
import TituloConAyuda from '../components/TituloConAyuda';

// Solo para ADMIN (Django también lo verifica con el rol del token)
export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#0E6B57');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCategorias(await obtenerCategorias());
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const mostrarToast = (mensaje, tipo = 'ok') => setToast({ mensaje, tipo, id: Date.now() });

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await crearCategoria({ nombre, color });
      setNombre('');
      mostrarToast('Categoría creada');
      cargarDatos();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const cambiarColor = async (categoria, nuevoColor) => {
    try {
      await actualizarCategoria(categoria.id, { color: nuevoColor });
      cargarDatos();
    } catch (err) {
      mostrarToast(mensajeError(err), 'error');
    }
  };

  const borrar = async (categoria) => {
    try {
      await eliminarCategoria(categoria.id);
      mostrarToast(`${categoria.nombre} borrada`);
      cargarDatos();
    } catch (err) {
      mostrarToast(mensajeError(err), 'error');
    }
  };

  return (
    <>
      <header className="encabezado">
        <div>
          <TituloConAyuda titulo="Categorías">
            Son compartidas por todos los usuarios. Las que están en uso no se pueden borrar.
          </TituloConAyuda>
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

      {toast && <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} alCerrar={() => setToast(null)} />}
    </>
  );
}
