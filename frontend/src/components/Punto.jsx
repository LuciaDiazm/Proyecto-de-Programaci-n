// Círculo chico con el color de una categoría (mismo motivo que Sello: el color viene de la base)
export default function Punto({ color }) {
  return (
    <svg className="punto-color" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <circle cx="5" cy="5" r="5" fill={color} />
    </svg>
  );
}
