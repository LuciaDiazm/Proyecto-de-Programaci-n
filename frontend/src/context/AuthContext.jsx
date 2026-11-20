import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CLAVE_REFRESH, CLAVE_TOKEN, configurarAlExpirarSesion, guardarSesion, limpiarSesion } from '../services/api';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');

  const cerrarSesion = useCallback((mensaje = '') => {
    const refreshToken = localStorage.getItem(CLAVE_REFRESH);
    limpiarSesion();
    setUsuario(null);
    setAviso(mensaje);
    // Revoca el refresh en el servidor; si falla, la sesión local ya quedó cerrada
    if (refreshToken) authService.logout(refreshToken).catch(() => {});
  }, []);

  // Si la renovación del token falla, se cierra la sesión
  useEffect(() => {
    configurarAlExpirarSesion(() => cerrarSesion('Tu sesión venció. Ingresá de nuevo.'));
  }, [cerrarSesion]);

  // Al abrir la app, si hay un token guardado se valida pidiendo el perfil
  useEffect(() => {
    if (!localStorage.getItem(CLAVE_TOKEN)) {
      setCargando(false);
      return;
    }
    authService
      .perfil()
      .then(setUsuario)
      .catch(() => limpiarSesion())
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = ({ token, refreshToken, usuario: datosUsuario }) => {
    guardarSesion({ token, refreshToken });
    setUsuario(datosUsuario);
    setAviso('');
  };

  return (
    <AuthContext.Provider
      value={{ usuario, setUsuario, cargando, iniciarSesion, cerrarSesion, aviso }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
