// Suscripciones que casi todos tienen, para cargarlas más rápido.
// La categoría es el nombre de una de las categorías iniciales de Django.
const SERVICIOS = [
  { nombre: 'Netflix', categoria: 'Streaming' },
  { nombre: 'Disney+', categoria: 'Streaming' },
  { nombre: 'Max', categoria: 'Streaming' },
  { nombre: 'Prime Video', categoria: 'Streaming' },
  { nombre: 'Paramount+', categoria: 'Streaming' },
  { nombre: 'Apple TV+', categoria: 'Streaming' },
  { nombre: 'Crunchyroll', categoria: 'Streaming' },
  { nombre: 'Flow', categoria: 'Streaming' },
  { nombre: 'YouTube Premium', categoria: 'Streaming' },
  { nombre: 'Spotify', categoria: 'Música' },
  { nombre: 'Apple Music', categoria: 'Música' },
  { nombre: 'Deezer', categoria: 'Música' },
  { nombre: 'ChatGPT Plus', categoria: 'Software' },
  { nombre: 'Google One', categoria: 'Software' },
  { nombre: 'iCloud+', categoria: 'Software' },
  { nombre: 'Microsoft 365', categoria: 'Software' },
  { nombre: 'Canva Pro', categoria: 'Software' },
  { nombre: 'Adobe Creative Cloud', categoria: 'Software' },
  { nombre: 'Xbox Game Pass', categoria: 'Software' },
  { nombre: 'PlayStation Plus', categoria: 'Software' },
  { nombre: 'Internet del hogar', categoria: 'Internet y telefonía' },
  { nombre: 'Plan de celular', categoria: 'Internet y telefonía' },
  { nombre: 'Gimnasio', categoria: 'Gimnasio' },
  { nombre: 'Seguro del auto', categoria: 'Seguros' },
  { nombre: 'Seguro del hogar', categoria: 'Seguros' },
  { nombre: 'Duolingo Super', categoria: 'Educación' },
  { nombre: 'Coursera Plus', categoria: 'Educación' },
];

// Ordenadas alfabéticamente para encontrarlas fácil en la lista
export const SERVICIOS_COMUNES = [...SERVICIOS].sort((a, b) => a.nombre.localeCompare(b.nombre));
