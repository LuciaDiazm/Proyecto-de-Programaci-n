// Funciones de formato para mostrar montos y fechas al estilo argentino

export function formatearMonto(monto, moneda = 'ARS', opciones = {}) {
  const numero = Number(monto) || 0;
  let usarDecimales = moneda === 'USD' || !Number.isInteger(numero);
  if (opciones.decimales !== undefined) usarDecimales = opciones.decimales;
  const texto = numero.toLocaleString('es-AR', {
    minimumFractionDigits: usarDecimales ? 2 : 0,
    maximumFractionDigits: usarDecimales ? 2 : 0,
  });
  return moneda === 'USD' ? `US$ ${texto}` : `$ ${texto}`;
}

// "2026-10-15" -> Date local (sin corrimientos por zona horaria)
export function aFecha(texto) {
  const [anio, mes, dia] = texto.slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function formatearFecha(texto, opciones = { day: 'numeric', month: 'short' }) {
  return aFecha(texto).toLocaleDateString('es-AR', opciones).replace('.', '');
}

export function describirDias(dias) {
  if (dias < 0) return dias === -1 ? 'Venció ayer' : `Venció hace ${-dias} días`;
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

export function estadoDeCobro(dias) {
  if (dias < 0) return 'atrasado';
  if (dias <= 3) return 'pronto';
  return 'normal';
}

export const FRECUENCIAS = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };
export const ESTADOS = { activa: 'Activa', pausada: 'Pausada', cancelada: 'Cancelada' };

// Convierte un total separado por moneda a pesos usando la cotización (si hay)
export function totalEnPesos(totales, cotizacion) {
  const ars = totales ? Number(totales.ARS) || 0 : 0;
  const usd = totales ? Number(totales.USD) || 0 : 0;
  if (!cotizacion) return { pesos: ars, dolaresSinConvertir: usd };
  return { pesos: ars + usd * cotizacion, dolaresSinConvertir: 0 };
}

// Una suscripción puede no tener categoría: en ese caso se usa gris y "Sin categoría"
export const COLOR_SIN_CATEGORIA = '#64748B';

export function colorDeCategoria(suscripcion) {
  return suscripcion.categoria_detalle ? suscripcion.categoria_detalle.color : COLOR_SIN_CATEGORIA;
}

export function nombreDeCategoria(suscripcion) {
  return suscripcion.categoria_detalle ? suscripcion.categoria_detalle.nombre : 'Sin categoría';
}

export function iniciales(nombre) {
  const palabras = nombre.trim().split(/\s+/);
  return (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : nombre.slice(0, 2)).toUpperCase();
}

export function hoyISO() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}
