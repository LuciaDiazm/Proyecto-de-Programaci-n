import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDatos } from '../context/DatosContext';
import { grupoService } from '../services/grupoService';

const FORMULARIO_VACIO = { nombre: '', descripcion: '' };

export default function Grupos() {
  const { mostrarToast } = useDatos();
  const [grupos, setGrupos] = useState(null);
  const [formData, setFormData] = useState(FORMULARIO_VACIO);
  const [error, setError] = useState('');

  useEffect(() => {
    grupoService.listar().then(setGrupos).catch((err) => setError(err.message));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const nuevo = await grupoService.crear(formData);
      setGrupos((actual) => [...actual, nuevo]);
      setFormData(FORMULARIO_VACIO);
      mostrarToast('Grupo creado');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Grupos</h1>
          <p className="texto-suave">Compartí gastos fijos con tu familia o tu equipo. Los admins editan; los miembros miran.</p>
        </div>
      </header>

      <form className="formulario formulario--linea bloque" onSubmit={handleSubmit}>
        <label className="campo">
          <span>Nuevo grupo</span>
          <input name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Casa" required />
        </label>
        <label className="campo">
          <span>Descripción (opcional)</span>
          <input name="descripcion" value={formData.descripcion} onChange={handleChange} />
        </label>
        <button className="boton boton--primario">Crear grupo</button>
        {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
      </form>

      {!grupos && !error && <div className="esqueleto" aria-busy="true" />}
      {grupos?.length === 0 && (
        <div className="vacio vacio--chico"><p>Todavía no formás parte de ningún grupo.</p></div>
      )}

      {grupos?.length > 0 && (
        <div className="tarjetas">
          {grupos.map((grupo) => (
            <article className="tarjeta" key={grupo.id}>
              <h3 className="tarjeta__titulo"><Link to={`/grupos/${grupo.id}`}>{grupo.nombre}</Link></h3>
              {grupo.descripcion && <p className="texto-suave">{grupo.descripcion}</p>}
              <p className="texto-suave">
                {grupo.membresias.length} {grupo.membresias.length === 1 ? 'miembro' : 'miembros'} · tu rol: {grupo.mi_rol}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
