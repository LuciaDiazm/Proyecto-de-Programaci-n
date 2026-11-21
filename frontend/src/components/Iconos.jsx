// Íconos SVG propios (trazo simple) para no depender de una librería
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IconoPanel = () => (
  <svg {...base}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
);
export const IconoLista = () => (
  <svg {...base}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></svg>
);
export const IconoCampana = () => (
  <svg {...base}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
export const IconoChispa = () => (
  <svg {...base}><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" /><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z" /></svg>
);
export const IconoUsuario = () => (
  <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const IconoEtiqueta = () => (
  <svg {...base}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="8" cy="8" r="1.5" /></svg>
);
export const IconoMas = () => (
  <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconoCheck = () => (
  <svg {...base}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconoSalir = () => (
  <svg {...base}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
);
export const IconoCerrar = () => (
  <svg {...base}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconoFlechaArriba = () => (
  <svg {...base} width={16} height={16}><path d="M7 17 17 7M8 7h9v9" /></svg>
);
export const IconoVolver = () => (
  <svg {...base}><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconoEdificio = () => (
  <svg {...base}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4M9 8h.01M15 8h.01M9 12h.01M15 12h.01" /></svg>
);
export const IconoGrupo = () => (
  <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></svg>
);
