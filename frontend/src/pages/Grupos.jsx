import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { crearGrupo, obtenerGrupos } from '../services/grupoService';
import { mensajeError } from '../services/api';
import Toast from '../components/Toast';
import TituloConAyuda from '../components/TituloConAyuda';

const FORMULARIO_VACIO = { nombre: '', descripcion: '' };

export default function Grupos() {
  const [grupos, setGrupos] = useState(null);
  const [formData, setFormData] = useState(FORMULARIO_VACIO);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    obtenerGrupos()
      .then(setGrupos)
      .catch((err) => setError(mensajeError(err)));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const nuevo = await crearGrupo(formData);
      setGrupos([...grupos, nuevo]);
      setFormData(FORMULARIO_VACIO);
      setToast({ mensaje: 'Grupo creado', id: Date.now() });
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <>
      <header className="encabezado">
        <div>
          <TituloConAyuda titulo="Grupos">
            Compartí gastos fijos con tu familia o tu equipo. Para sumar a alguien, tiene que tener una cuenta en Al Día.
            Para compartir una suscripción, al crearla o editarla elegí el grupo en el campo Compartir con un grupo. Los
            admins editan; los miembros solo miran.
          </TituloConAyuda>
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
      {grupos && grupos.length === 0 && (
        <div className="vacio vacio--chico"><p>Todavía no formás parte de ningún grupo.</p></div>
      )}

      {grupos && grupos.length > 0 && (
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

      {toast && <Toast key={toast.id} mensaje={toast.mensaje} alCerrar={() => setToast(null)} />}
    </>
  );
}
