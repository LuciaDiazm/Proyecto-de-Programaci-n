import { useEffect, useState } from 'react';
import { obtenerCategorias } from '../services/categoriaService';
import { obtenerEtiquetas } from '../services/etiquetaService';
import { obtenerGrupos } from '../services/grupoService';
import { actualizarSuscripcion, crearSuscripcion } from '../services/suscripcionService';
import { mensajeError } from '../services/api';
import { hoyISO } from '../utils/formato';
import Modal from './Modal';

const VACIO = {
  nombre: '',
  monto: '',
  moneda: 'ARS',
  frecuencia: 'mensual',
  cada_meses: '2',
  dia_cobro: String(new Date().getDate()),
  fecha_inicio: hoyISO(),
  categoria: '',
  grupo: '',
  etiquetas: [],
  descripcion: '',
};

// Arma el formulario con los datos de la suscripción que se está editando
const desdeSuscripcion = (suscripcion) => ({
  nombre: suscripcion.nombre,
  monto: String(suscripcion.monto),
  moneda: suscripcion.moneda,
  frecuencia: suscripcion.frecuencia,
  // Si no es personalizada, se propone 2 por si el usuario la cambia
  cada_meses: suscripcion.frecuencia === 'personalizada' ? String(suscripcion.cada_meses) : '2',
  dia_cobro: String(suscripcion.dia_cobro),
  fecha_inicio: suscripcion.fecha_inicio,
  categoria: suscripcion.categoria ? String(suscripcion.categoria) : '',
  grupo: suscripcion.grupo ? String(suscripcion.grupo) : '',
  etiquetas: suscripcion.etiquetas,
  descripcion: suscripcion.descripcion,
});

export default function FormSuscripcion({ suscripcion, alCerrar, alGuardar }) {
  const editando = Boolean(suscripcion);
  const [form, setForm] = useState(editando ? desdeSuscripcion(suscripcion) : VACIO);
  const [categorias, setCategorias] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerCategorias().then(setCategorias).catch(() => {});
    obtenerEtiquetas().then(setEtiquetas).catch(() => {});
    // Solo un admin del grupo puede compartir suscripciones en él
    obtenerGrupos()
      .then((lista) => setGrupos(lista.filter((g) => g.mi_rol === 'admin')))
      .catch(() => {});
  }, []);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Se envían como lista de ids, por ejemplo [1, 3]
  const alternarEtiqueta = (id) => {
    const elegidas = form.etiquetas.includes(id)
      ? form.etiquetas.filter((otra) => otra !== id)
      : [...form.etiquetas, id];
    setForm({ ...form, etiquetas: elegidas });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    const datos = {
      ...form,
      monto: form.monto.replace(',', '.'),
      dia_cobro: Number(form.dia_cobro),
      cada_meses: form.frecuencia === 'personalizada' ? Number(form.cada_meses) : 1,
      categoria: form.categoria ? Number(form.categoria) : null,
      grupo: form.grupo ? Number(form.grupo) : null,
    };
    try {
      const guardada = editando
        ? await actualizarSuscripcion(suscripcion.id, datos)
        : await crearSuscripcion(datos);
      alGuardar(guardada);
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={editando ? `Editar ${suscripcion.nombre}` : 'Nueva suscripción'} alCerrar={alCerrar}>
      <form className="formulario formulario--grilla" onSubmit={enviar}>
        <label className="campo campo--doble">
          <span>Nombre</span>
          <input name="nombre" value={form.nombre} onChange={cambiar} placeholder="Netflix, gimnasio, seguro del auto…" autoFocus required />
        </label>

        <label className="campo">
          <span>Monto</span>
          <input name="monto" value={form.monto} onChange={cambiar} inputMode="decimal" placeholder="0" required />
        </label>
        <label className="campo">
          <span>Moneda</span>
          <select name="moneda" value={form.moneda} onChange={cambiar}>
            <option value="ARS">Pesos</option>
            <option value="USD">Dólares</option>
          </select>
        </label>

        <label className="campo">
          <span>Se cobra</span>
          <select name="frecuencia" value={form.frecuencia} onChange={cambiar}>
            <option value="mensual">Todos los meses</option>
            <option value="trimestral">Cada 3 meses</option>
            <option value="anual">Una vez al año</option>
            <option value="personalizada">Cada X meses</option>
          </select>
        </label>
        {form.frecuencia === 'personalizada' && (
          <label className="campo">
            <span>Cada cuántos meses</span>
            <input name="cada_meses" type="number" min="2" max="24" value={form.cada_meses} onChange={cambiar} required />
            <small>Por ejemplo, 6 si se paga dos veces por año.</small>
          </label>
        )}
        <label className="campo">
          <span>Día de cobro</span>
          <input name="dia_cobro" type="number" min="1" max="31" value={form.dia_cobro} onChange={cambiar} required />
          {Number(form.dia_cobro) > 28 && <small>En meses más cortos se cobra el último día.</small>}
        </label>

        <label className="campo">
          <span>Desde</span>
          <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={cambiar} required />
        </label>
        <label className="campo">
          <span>Categoría</span>
          <select name="categoria" value={form.categoria} onChange={cambiar}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>

        {grupos.length > 0 && (
          <label className="campo campo--doble">
            <span>Compartir con un grupo</span>
            <select name="grupo" value={form.grupo} onChange={cambiar}>
              <option value="">No, es solo mía</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </label>
        )}

        {etiquetas.length > 0 && (
          <fieldset className="opciones campo--doble">
            <legend>Etiquetas</legend>
            {etiquetas.map((et) => (
              <label key={et.id}>
                <input
                  type="checkbox"
                  checked={form.etiquetas.includes(et.id)}
                  onChange={() => alternarEtiqueta(et.id)}
                />
                {et.nombre}
              </label>
            ))}
          </fieldset>
        )}

        <label className="campo campo--doble">
          <span>Notas (opcional)</span>
          <textarea name="descripcion" value={form.descripcion} onChange={cambiar} rows="2" placeholder="Plan familiar, se paga con la tarjeta Visa…" />
        </label>

        {error && <p className="mensaje mensaje--error campo--doble" role="alert">{error}</p>}

        <div className="formulario__acciones campo--doble">
          <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
          <button className="boton boton--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar suscripción'}
          </button>
        </div>
      </form>
    </Modal>
  );
}