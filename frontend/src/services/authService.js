import { apiNode } from './api';

// La sesión vive en localStorage, como en el material: el token y los datos del usuario
// (nombre y rol, para mostrar el menú y proteger la ruta de ADMIN)
export const guardarUsuario = (usuario) => {
  localStorage.setItem('usuario', JSON.stringify(usuario));
};

export const obtenerUsuario = () => {
  const texto = localStorage.getItem('usuario');
  return texto ? JSON.parse(texto) : null;
};

export const obtenerPerfil = async () => {
  const respuesta = await apiNode.get('/api/auth/perfil');
  return respuesta.data;
};

const guardarSesion = async (datos) => {
  localStorage.setItem('token', datos.token);
  // Si la respuesta no trae el usuario, se pide el perfil con el token recién guardado
  const usuario = datos.usuario ? datos.usuario : await obtenerPerfil();
  guardarUsuario(usuario);
  return usuario;
};

export const login = async (email, password) => {
  const respuesta = await apiNode.post('/api/auth/login', { email, password });
  return guardarSesion(respuesta.data);
};

export const registro = async (datos) => {
  const respuesta = await apiNode.post('/api/auth/registro', datos);
  return guardarSesion(respuesta.data);
};

// Cerrar sesión = borrar el token y el usuario
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
};

export const actualizarPerfil = async (datos) => {
  const respuesta = await apiNode.patch('/api/auth/perfil', datos);
  guardarUsuario(respuesta.data);
  return respuesta.data;
};
