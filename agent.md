# Contexto del proyecto para agentes de IA

Leer `spec.md` antes de generar código: es la fuente de verdad del comportamiento.

## Stack

- `backend-node`: Node 24, Express 5, Mongoose, ES Modules, Socket.IO, Jest + Supertest.
- `backend-django`: Python 3.12, Django, DRF, simplejwt, Channels + Daphne, Graphene, pytest.
- `frontend`: React 19, Vite, React Router, Axios, socket.io-client.
- Bases: MongoDB, PostgreSQL (SQLite por defecto en desarrollo) y Redis.

## Arquitectura

- Node: `index.js` → `src/server.js` (HTTP y sockets) → `src/app.js` (Express, sin `listen`). Capas: `routes` → `middlewares` → `controllers` → `services` / `models`.
- Django: `views` → `services` (reglas de negocio) → `repositories` (consultas). Los serializers validan y limpian la entrada.
- React: las páginas guardan el estado, los componentes reciben props y solo `src/services` conoce las URLs.
- Identidad: Node emite el JWT y Django lo verifica con la misma `JWT_SECRET`. Las cuentas propias de Django tienen id `dj-<pk>`.

## Patrones obligatorios

- El id del usuario siempre sale del token, nunca del body.
- Validar con `express-validator` en Node y con serializers en Django.
- Borrado lógico para proveedores, planes y suscripciones.
- `transaction.atomic` cuando una operación escribe en más de una tabla.
- `timeout` en toda llamada a otro servidor.
- Errores en el formato de `spec.md`.
- Toda ruta nueva lleva pruebas de camino feliz y de error.

## Restricciones

- No versionar `.env` ni claves. Las configuraciones van por variables de entorno.
- No usar `float` para dinero en Django: usar `Decimal`.
- No devolver contraseñas ni detalles internos en las respuestas.
- Los tests no pueden depender de internet, Redis ni bases reales.
- No agregar librerías si lo que ya está instalado resuelve el problema.
