import { useState } from 'react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';

export default function Perfil() {
  const { usuario, setUsuario, cerrarSesion } = useAuth();
  const { mostrarToast } = useDatos();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [diasAviso, setDiasAviso] = useState(usuario.diasAviso);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const actualizado = await authService.actualizarPerfil({ nombre, diasAviso: Number(diasAviso) });
      setUsuario(actualizado);
      mostrarToast('Perfil actualizado');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <header className="encabezado">
        <h1>Perfil</h1>
      </header>

      <form className="formulario bloque formulario--angosto" onSubmit={guardar}>
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
          <button type="button" className="boton" onClick={() => cerrarSesion()}>Cerrar sesión</button>
          <button className="boton boton--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
      {usuario.rol === 'ADMIN' && <p className="texto-suave">Tu cuenta es de administrador: podés gestionar las categorías.</p>}
    </>
  );
}
