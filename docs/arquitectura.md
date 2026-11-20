# Decisiones de arquitectura

**Proyecto:** Al Día. **Materia:** Programación IV. **Integrantes:** Marianela Vazquez (API Django), Melina Tomasella (API Node), Lucía Diaz (frontend y coordinación).

## Dos APIs, dos bases

Las suscripciones y los pagos son datos con relaciones fijas y dinero, por eso viven en PostgreSQL con Django: claves foráneas, `Decimal`, transacciones y agregaciones por mes. Los usuarios, el historial de precios, los avisos y los proveedores son documentos que crecen o cambian de forma, por eso viven en MongoDB con Node.

Node emite el JWT y Django lo valida con la misma clave, sin consultar a Node en cada petición. Para que las cuentas propias de Django (incluidas las de Google) no choquen con las de Node, su id se guarda como `dj-<pk>`. Las dos APIs se hablan entre servidores con una cabecera `X-API-KEY`: Django avisa a Node cada cambio de precio y Node le pide a Django los cobros próximos para generar los avisos.

## Capas

En Django, las vistas solo traducen HTTP, los servicios tienen las reglas de negocio y los repositorios concentran las consultas. Así las reglas se prueban sin pasar por HTTP. En Node, `src/app.js` no levanta el servidor, para que Supertest pueda probar las rutas directamente y Socket.IO se monte aparte en `src/server.js`.

En el frontend, la misma idea se aplica con tres capas:

- **Servicios** (`src/services`): son lo único que habla con las APIs. `api.js` crea una instancia de Axios para cada API, y hay un archivo por entidad (`suscripcionService.js`, `proveedorService.js`, etc.) con funciones exportadas como `obtenerSuscripciones` o `crearProveedor`.
- **Páginas** (`src/pages`): una por ruta. Guardan su estado con `useState`, cargan sus datos con `useEffect` y llaman a los servicios.
- **Componentes** (`src/components`): solo muestran lo que reciben por props y avisan las acciones con funciones (`onEdit`, `onDelete`).

## Sesión en el frontend

Al iniciar sesión se guardan en `localStorage` el token y los datos básicos del usuario (nombre y rol). No hace falta un Context: cualquier parte de la app los lee de ahí cuando los necesita, y cerrar sesión es borrarlos.

Los interceptores de Axios concentran la autenticación en un solo lugar. El de **petición** agrega `Authorization: Bearer <token>` a cada llamada, a las dos APIs. El de **respuesta** detecta un 401 (token vencido o inválido), borra la sesión y lleva al ingreso. Así ninguna página tiene que repetir esa lógica.

`ProtectedRoute` envuelve todas las rutas privadas con `Outlet`: si no hay token, redirige a `/ingresar`. Con la opción `soloAdmin` también controla el rol, y así protege la pantalla de categorías. Es solo una comodidad de la interfaz: quien realmente decide son las APIs, que validan el token y el rol en cada petición.

## Seguridad

- **Tokens:** un único JWT que vence a las 8 horas, firmado por Node con `JWT_SECRET` y `JWT_ISSUER`. Al vencer, el usuario vuelve a iniciar sesión.
- **Roles:** Node distingue USUARIO y ADMIN. En Django, además, cada grupo tiene sus roles: `has_object_permission` protege los objetos existentes y `perform_create` verifica al crear, porque ahí todavía no hay objeto.
- **Entrada:** `express-validator` en Node, serializers y `nh3` en Django. React escapa el texto al mostrarlo.
- **Abuso:** rate limiting global y de login en Node, throttling por usuario, IP y login en Django.
- **Auditoría:** `SecurityLog` y `security.log` registran logins fallidos y accesos denegados.
- **Claves:** ninguna clave real está en el repositorio. Cada entorno tiene su `.env` o `.env.docker`, ignorados por Git, y los `.env.example` documentan qué variables hacen falta.

## Tiempo real: dos tecnologías, dos usos

Socket.IO en Node manda los avisos personales: cada usuario entra a su propia sala al conectarse con su token. El frontend abre esa conexión una sola vez, en el `Layout`, y muestra cada aviso como un mensaje emergente y en el contador de no leídas.

Django Channels maneja los grupos: presencia y cambios compartidos, con Redis como capa de canales para poder correr más de una instancia. El cliente del grupo (`tiempoReal.js`) usa WebSocket nativo y, si la conexión se corta, reintenta con backoff exponencial (de 1 a 30 segundos) y jitter, para que todos los clientes no reintenten a la vez después de un corte. Al reconectarse, vuelve a pedir los datos por REST, porque los mensajes de WebSocket que se perdieron no se guardan.

El puente con Firebase sigue el patrón "Backend as a Bridge": el navegador no conoce las credenciales ni habla con Firebase. Es opcional y se activa por variables de entorno.

## APIs externas

La cotización del dólar se guarda 30 minutos en memoria y los feriados se cachean con el patrón cache-aside. Todas las llamadas tienen `timeout`. Si el servicio de feriados falla, la suscripción se muestra igual, sin ese dato. Si la otra API no responde al registrar un precio, la operación principal igual se guarda. En el frontend, si no llega el dólar, los montos en dólares se muestran sin convertir.

## REST y GraphQL

REST es la interfaz principal, con paginación, filtros y orden. Como Django pagina y Node no, el frontend tiene una sola función (`resultados`) que devuelve la lista en los dos casos. GraphQL se agregó para las pantallas que necesitan datos anidados en una sola consulta, y usa los mismos servicios, así que las reglas de negocio y de permisos no se duplican.

## Interfaz sin librerías extra

El frontend usa solo React, React Router, Axios y socket.io-client. Los totales por categoría y el gasto por mes se muestran con listas y el elemento `<meter>` de HTML en lugar de una librería de gráficos, lo que redujo el tamaño del bundle a la mitad. Los colores de cada categoría vienen de la base de datos, y se pintan con el atributo `fill` de pequeños SVG, en lugar de estilos en línea.

## Pruebas y despliegue

Los tests reemplazan las dependencias externas con mocks y una capa de canales en memoria, y por eso corren en CI sin servicios adicionales. GitHub Actions ejecuta pytest con cobertura, Jest y el build del frontend en cada push. Docker Compose levanta las dos APIs, PostgreSQL, MongoDB y Redis. En producción, Daphne sirve HTTP y WebSocket, y WhiteNoise, los estáticos.
