import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function Acceso({ modo }) {
  const esRegistro = modo === 'registro';
  const { iniciarSesion, aviso } = useAuth();
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const datos = esRegistro
        ? await authService.registro(form)
        : await authService.login({ email: form.email, password: form.password });
      iniciarSesion(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="acceso">
      <section className="acceso__intro">
        <div className="marca marca--grande">
          <img src="/icono.svg" alt="" width="40" height="40" />
          <span>Al Día</span>
        </div>
        <h1>Sabé cuánto te cobran, cuándo y cuánto aumentó.</h1>
        <p>
          Cargá tus suscripciones y gastos fijos una vez. Al Día te avisa antes de cada débito,
          convierte los cobros en dólares con el dólar tarjeta y te muestra cada aumento.
        </p>
        <ul className="acceso__muestra" aria-hidden="true">
          <li><span style={{ background: '#E11D48' }}>NE</span>12</li>
          <li><span style={{ background: '#16A34A' }}>SP</span>15</li>
          <li className="pronto"><span style={{ background: '#EA580C' }}>GI</span>18</li>
          <li><span style={{ background: '#0891B2' }}>IN</span>20</li>
          <li><span style={{ background: '#7C3AED' }}>SE</span>28</li>
        </ul>
      </section>

      <section className="acceso__panel">
        <form className="formulario" onSubmit={enviar} noValidate>
          <h2>{esRegistro ? 'Crear cuenta' : 'Ingresar'}</h2>
          {aviso && !error && <p className="mensaje mensaje--info">{aviso}</p>}

          {esRegistro && (
            <label className="campo">
              <span>Nombre</span>
              <input name="nombre" value={form.nombre} onChange={cambiar} autoComplete="name" required />
            </label>
          )}
          <label className="campo">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={cambiar} autoComplete="email" required />
          </label>
          <label className="campo">
            <span>Contraseña</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={cambiar}
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              required
            />
            {esRegistro && <small>Mínimo 8 caracteres, con letras y números.</small>}
          </label>

          {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}

          <button className="boton boton--primario boton--ancho" disabled={enviando}>
            {enviando ? 'Un momento…' : esRegistro ? 'Crear cuenta' : 'Ingresar'}
          </button>

          <p className="acceso__cambio">
            {esRegistro ? (
              <>¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link></>
            ) : (
              <>¿Primera vez? <Link to="/registro">Creá tu cuenta</Link></>
            )}
          </p>
        </form>
      </section>
    </div>
  );
}
