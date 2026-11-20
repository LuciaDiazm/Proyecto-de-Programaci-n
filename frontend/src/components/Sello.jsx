import { COLOR_SIN_CATEGORIA, iniciales } from '../utils/formato';

// Cuadradito con las iniciales del servicio, pintado con el color de su categoría.
// El color viene de la base de datos (lo elige el admin), así que no puede estar en una
// clase fija de index.css: se pinta con el atributo fill del SVG.
export default function Sello({ nombre, color = COLOR_SIN_CATEGORIA, tamano = 36 }) {
  return (
    <svg className="sello" width={tamano} height={tamano} viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill={color} />
      <text x="18" y="19" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="13" fontWeight="600">
        {iniciales(nombre)}
      </text>
    </svg>
  );
}
