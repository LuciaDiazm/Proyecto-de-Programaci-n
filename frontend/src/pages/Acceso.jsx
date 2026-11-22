import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { login, obtenerUsuario, registro } from '../services/authService';
import { mensajeError } from '../services/api';

export default function Acceso({ modo }) {
  const esRegistro = modo === 'registro';
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      // El servicio guarda el token y el usuario en localStorage
      if (esRegistro) {
        await registro(form);
      } else {
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  // Si ya hay sesión iniciada, no tiene sentido mostrar el login.
  // Se pide lo mismo que en ProtectedRoute (token y usuario); si no, se mandarían uno al otro sin fin
  if (localStorage.getItem('token') && obtenerUsuario()) return <Navigate to="/" replace />;

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
          <li><span className="muestra--rosa">NE</span>12</li>
          <li><span className="muestra--verde">SP</span>15</li>
          <li className="pronto"><span className="muestra--naranja">GI</span>18</li>
          <li><span className="muestra--celeste">IN</span>20</li>
          <li><span className="muestra--violeta">SE</span>28</li>
        </ul>
      </section>

      <section className="acceso__panel">
        <form className="formulario" onSubmit={enviar} noValidate>
          <h2>{esRegistro ? 'Crear cuenta' : 'Ingresar'}</h2>

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
