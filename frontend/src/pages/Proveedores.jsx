import { useEffect, useState } from 'react';
import ProveedorCard from '../components/ProveedorCard';
import Toast from '../components/Toast';
import { obtenerUsuario } from '../services/authService';
import { mensajeError } from '../services/api';
import {
  actualizarProveedor,
  calificarProveedor,
  crearProveedor,
  eliminarProveedor,
  obtenerProveedores,
} from '../services/proveedorService';

const CATEGORIAS = ['STREAMING', 'SOFTWARE', 'TELEFONIA', 'SERVICIOS', 'OTROS'];

const FORMULARIO_VACIO = {
  razonSocial: '',
  cuit: '',
  contacto: { email: '', telefono: '' },
  categorias: [],
};

// Módulo 5: la página maneja el estado y llama a los servicios; la tarjeta solo muestra
export default function Proveedores() {
  const usuario = obtenerUsuario();
  const [lista, setLista] = useState(null);
  const [formData, setFormData] = useState(FORMULARIO_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLista(await obtenerProveedores());
      setError('');
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const mostrarToast = (mensaje, tipo = 'ok') => setToast({ mensaje, tipo, id: Date.now() });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleContacto = (e) =>
    setFormData({ ...formData, contacto: { ...formData.contacto, [e.target.name]: e.target.value } });

  const alternarCategoria = (categoria) => {
    const categorias = formData.categorias.includes(categoria)
      ? formData.categorias.filter((c) => c !== categoria)
      : [...formData.categorias, categoria];
    setFormData({ ...formData, categorias });
  };

  const limpiarFormulario = () => {
    setFormData(FORMULARIO_VACIO);
    setEditandoId(null);
    setError('');
  };

  const reemplazarEnLista = (actualizado) =>
    setLista(lista.map((item) => (item._id === actualizado._id ? actualizado : item)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editandoId) {
        reemplazarEnLista(await actualizarProveedor(editandoId, formData));
        mostrarToast('Proveedor actualizado');
      } else {
        const nuevo = await crearProveedor(formData);
        setLista([...lista, nuevo]);
        mostrarToast('Proveedor creado');
      }
      limpiarFormulario();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const prepararEdicion = (item) => {
    const contacto = item.contacto || {};
    setEditandoId(item._id);
    setFormData({
      razonSocial: item.razonSocial,
      cuit: item.cuit,
      contacto: { email: contacto.email || '', telefono: contacto.telefono || '' },
      categorias: item.categorias || [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBorrar = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return;
    try {
      await eliminarProveedor(id);
      setLista(lista.filter((item) => item._id !== id));
      mostrarToast('Proveedor eliminado');
    } catch (err) {
      mostrarToast(mensajeError(err), 'error');
    }
  };

  const handleCalificar = async (id, calificacion) => {
    try {
      reemplazarEnLista(await calificarProveedor(id, calificacion));
    } catch (err) {
      mostrarToast(mensajeError(err), 'error');
    }
  };

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Proveedores</h1>
          <p className="texto-suave">Las empresas que te cobran. Calificalas para acordarte con cuáles conviene seguir.</p>
        </div>
      </header>

      <form className="formulario formulario--grilla bloque" onSubmit={handleSubmit}>
        <label className="campo">
          <span>Razón social</span>
          <input name="razonSocial" value={formData.razonSocial} onChange={handleChange} required />
        </label>
        <label className="campo">
          <span>CUIT (11 números, sin guiones)</span>
          <input name="cuit" value={formData.cuit} onChange={handleChange} inputMode="numeric" pattern="\d{11}" required />
        </label>
        <label className="campo">
          <span>Email de contacto</span>
          <input name="email" type="email" value={formData.contacto.email} onChange={handleContacto} required />
        </label>
        <label className="campo">
          <span>Teléfono (opcional)</span>
          <input name="telefono" value={formData.contacto.telefono} onChange={handleContacto} />
        </label>

        <fieldset className="opciones campo--doble">
          <legend>Categorías</legend>
          {CATEGORIAS.map((categoria) => (
            <label key={categoria}>
              <input
                type="checkbox"
                checked={formData.categorias.includes(categoria)}
                onChange={() => alternarCategoria(categoria)}
              />
              {categoria.toLowerCase()}
            </label>
          ))}
        </fieldset>

        {error && <p className="mensaje mensaje--error campo--doble" role="alert">{error}</p>}

        <div className="formulario__acciones campo--doble">
          {editandoId && <button type="button" className="boton" onClick={limpiarFormulario}>Cancelar</button>}
          <button className="boton boton--primario">{editandoId ? 'Guardar cambios' : 'Agregar proveedor'}</button>
        </div>
      </form>

      {!lista && !error && <div className="esqueleto" aria-busy="true" />}
      {lista && lista.length === 0 && (
        <div className="vacio vacio--chico"><p>Todavía no cargaste proveedores.</p></div>
      )}

      {lista && lista.length > 0 && (
        <div className="tarjetas">
          {lista.map((item) => (
            <ProveedorCard
              key={item._id}
              item={item}
              onEdit={prepararEdicion}
              onCalificar={handleCalificar}
              onDelete={usuario.rol === 'ADMIN' ? handleBorrar : undefined}
            />
          ))}
        </div>
      )}

      {toast && <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} alCerrar={() => setToast(null)} />}
    </>
  );
}
