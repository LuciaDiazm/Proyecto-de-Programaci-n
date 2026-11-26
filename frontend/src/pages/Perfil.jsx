import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { actualizarPerfil, logout, obtenerUsuario } from '../services/authService';
import { mensajeError } from '../services/api';
import Toast from '../components/Toast';
import TituloConAyuda from '../components/TituloConAyuda';

// enPanel: se muestra dentro del desplegable de arriba, con una cabecera más chica
export default function Perfil({ enPanel }) {
  const usuario = obtenerUsuario();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [diasAviso, setDiasAviso] = useState(usuario.diasAviso);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      // El servicio también actualiza el usuario guardado en localStorage
      await actualizarPerfil({ nombre, diasAviso: Number(diasAviso) });
      setToast({ mensaje: 'Perfil actualizado', id: Date.now() });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = () => {
    logout();
    navigate('/ingresar');
  };

  return (
    <>
      {enPanel ? (
        <div className="desplegable__cabecera">
          <h2>Perfil</h2>
          <p className="texto-suave">Tus datos y cuántos días antes de cada cobro querés que te avisemos.</p>
        </div>
      ) : (
        <header className="encabezado">
          <div>
            <TituloConAyuda titulo="Perfil">
              Tus datos y cuántos días antes de cada cobro querés que te avisemos.
            </TituloConAyuda>
          </div>
        </header>
      )}

      <form className={enPanel ? 'formulario' : 'formulario bloque formulario--angosto'} onSubmit={guardar}>
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Email</span>
          <input value={usuario.email} disabled />
        </label>
        <label className="campo">
          <span>Avisarme antes de cada cobro</span>
          <div className="deslizador">
            <input type="range" min="0" max="15" value={diasAviso} onChange={(e) => setDiasAviso(e.target.value)} />
            <output>
              {Number(diasAviso) === 0 ? 'El mismo día' : `${diasAviso} ${Number(diasAviso) === 1 ? 'día' : 'días'} antes`}
            </output>
          </div>
        </label>
        {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
        <div className="formulario__acciones">
          <button type="button" className="boton" onClick={cerrarSesion}>Cerrar sesión</button>
          <button className="boton boton--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
      {usuario.rol === 'ADMIN' && <p className="texto-suave">Tu cuenta es de administrador: podés gestionar las categorías.</p>}
      {toast && <Toast key={toast.id} mensaje={toast.mensaje} alCerrar={() => setToast(null)} />}
    </>
  );
}
