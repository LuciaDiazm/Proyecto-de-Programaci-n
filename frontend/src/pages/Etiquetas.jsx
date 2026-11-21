import { useEffect, useState } from 'react';
import { crearEtiqueta, eliminarEtiqueta, obtenerEtiquetas } from '../services/etiquetaService';
import { mensajeError } from '../services/api';
import Toast from '../components/Toast';

// Cada usuario arma sus propias etiquetas para ordenar sus suscripciones
export default function Etiquetas() {
  const [etiquetas, setEtiquetas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setEtiquetas(await obtenerEtiquetas());
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const mostrarToast = (mensaje, tipo = 'ok') => setToast({ mensaje, tipo, id: Date.now() });

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await crearEtiqueta({ nombre });
      setNombre('');
      mostrarToast('Etiqueta creada');
      cargarDatos();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const borrar = async (etiqueta) => {
    try {
      await eliminarEtiqueta(etiqueta.id);
      mostrarToast(`${etiqueta.nombre} borrada`);
      cargarDatos();
    } catch (err) {
      mostrarToast(mensajeError(err), 'error');
    }
  };

  return (
    <>
      <header className="encabezado">
        <h1>Etiquetas</h1>
      </header>

      <form className="formulario formulario--linea bloque" onSubmit={crear}>
        <label className="campo">
          <span>Nueva etiqueta</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: trabajo" required />
        </label>
        <button className="boton boton--primario">Crear etiqueta</button>
        {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
      </form>

      <ul className="categorias">
        {etiquetas.map((et) => (
          <li key={et.id}>
            <span>{et.nombre}</span>
            <button className="boton boton--chico" onClick={() => borrar(et)}>Borrar</button>
          </li>
        ))}
      </ul>

      {toast && <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} alCerrar={() => setToast(null)} />}
    </>
  );
}