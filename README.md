# Al Día · Control de suscripciones y gastos fijos

Proyecto final de Programación IV. Permite cargar suscripciones y gastos fijos (Netflix, gimnasio, internet, seguros), ver cuándo se debita cada uno, recibir avisos antes del cobro, registrar los pagos, seguir los aumentos de precio, convertir los cobros en dólares con el dólar tarjeta y compartir gastos en grupos. Incluye un asesor con IA que sugiere qué revisar o cancelar.

Documentos: [especificación](spec.md), [contexto para agentes](agent.md) y [decisiones de arquitectura](docs/arquitectura.md).

## Arquitectura

```
                    ┌──────────────────────────┐
                    │  Frontend (React + Vite) │  localhost:5173
                    └─────┬──────────────┬─────┘
    login, proveedores,   │              │  suscripciones, pagos,
    avisos, historial, IA │  JWT         │  grupos, categorías
    Socket.IO             ▼              ▼  WebSocket, GraphQL
   ┌───────────────────────────┐    ┌───────────────────────────┐
   │ API Node.js (Express)     │◄──►│ API Django (DRF, Channels)│
   │ localhost:3000            │    │ localhost:8000            │
   │ Emite el JWT              │    │ Verifica el mismo JWT     │
   └─────────────┬─────────────┘    └──────┬──────────────┬─────┘
                 ▼                         ▼              ▼
              MongoDB                  PostgreSQL       Redis
```

| Tecnología | Qué guarda o hace | Por qué |
|---|---|---|
| PostgreSQL + Django | Suscripciones, pagos, categorías, grupos | Datos con relaciones fijas, montos en `Decimal`, transacciones y agrupaciones por mes en la base. |
| MongoDB + Node | Usuarios, proveedores, planes, historial, avisos, análisis de IA | Registros que crecen con el tiempo y estructuras flexibles. |
| Redis | Capa de canales de Django Channels | Permite repartir los mensajes de los grupos entre instancias. |

**Cómo se comunican las dos APIs**

1. **Usuario → ambas APIs:** Node firma el JWT al hacer login. Django lo valida con la misma `JWT_SECRET`. El id del usuario siempre sale del token.
2. **Django → Node:** al crear una suscripción o cambiar su precio, Django avisa a `POST /api/historial/interno` con `X-API-KEY`. Si Node no responde, la operación en Django igual se guarda.
3. **Node → Django:** cada hora Node consulta `GET /api/internos/proximos-cobros/` con `X-API-KEY` y genera los avisos.

## Qué se ve de cada clase

| Tema | Dónde está |
|---|---|
| ES Modules, clases, `#privados`, herencia, getters/setters, errores propios | `backend-node/src/utils/Monto.js` y `errores.js` |
| Estructura `index.js`, `src/app.js`, `src/server.js`, `conectarBD` | `backend-node` |
| Mongoose, CRUD completo, `populate` básico, con selección, múltiple y anidado | `Proveedor`, `Plan`, `Paquete` |
| JWT, roles, validaciones, rate limit, helmet, CORS, API externa con 502 | `backend-node/src/middlewares`, `services` |
| Socket.IO y puente con Firebase | `backend-node/src/sockets` |
| Jest + Supertest con mocks, caminos felices y de error | `backend-node/tests` |
| Axios con interceptores, servicios, rutas protegidas, CRUD en React | `frontend/src/services`, `components/ProtectedRoute.jsx`, `pages/Proveedores.jsx` |
| SDD | `spec.md`, `agent.md` |
| Importación de archivos y logging | `backend-django/.../importar_suscripciones.py` |
| Capas Repository y Service, `@action`, paginación, filtros, búsqueda y orden | `repositories.py`, `services.py`, `views.py` |
| API externa con timeout y cache-aside, `SerializerMethodField` | `HolidayService`, `cobro_en_feriado` |
| simplejwt con rotación y blacklist, registro, Google con allauth | `config/urls.py`, `serializers.py` |
| Roles por recurso, `has_object_permission`, `transaction.atomic` | `Grupo`, `MembresiaGrupo`, `permisos.py` |
| Throttling, `nh3`, CORS, auditoría | `throttles.py`, `serializers.py`, `SecurityLog` |
| Channels, ASGI, grupos, presencia, JWT en WebSocket, Redis | `consumers.py`, `ws_auth.py`, `routing.py` |
| Reconexión con backoff, jitter y resincronización | `frontend/src/services/tiempoReal.js` |
| GraphQL con Graphene, queries y mutations | `suscripciones/schema.py` |
| pytest, fixtures y cobertura | `backend-django/tests` |
| Docker, Compose, CI, WhiteNoise y `check --deploy` | `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` |

## Cómo levantarlo

Requisitos: Python 3.12+, Node 20+ y MongoDB (instalado o con Docker). Django usa SQLite por defecto; PostgreSQL se activa con `DB_ENGINE=postgresql`.

### Todo con Docker

```bash
docker compose up --build
```

Levanta las dos APIs, PostgreSQL, MongoDB y Redis con los valores de ejemplo de los archivos `.env.docker`. El frontend se corre aparte (paso 3 de abajo).

Para desarrollar con Docker solo para las bases:

```bash
docker compose up -d db mongo redis
```

### Sin Docker

Generar dos claves largas, por ejemplo con `python -c "import secrets; print(secrets.token_hex(32))"`:
- `JWT_SECRET`: **la misma** en el `.env` de Node y en el de Django.
- `API_KEY_INTERNA`: **la misma** en los dos `.env`.

**1. API Django**

```bash
cd backend-django
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
daphne -p 8000 config.asgi:application
```

**2. API Node**

```bash
cd backend-node
npm install
copy .env.example .env
npm run dev
npm run crear-admin -- admin@aldia.com Admin1234 "Admin"
```

El último comando es opcional. El asesor con IA necesita `GEMINI_API_KEY` y el puente con Firebase necesita `FIREBASE_KEY_PATH` y `FIREBASE_DATABASE_URL`; sin ellas, todo lo demás funciona.

**3. Frontend**

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

### Datos de ejemplo

Con un usuario registrado, copiar su id (aparece en `GET /api/auth/perfil`) y ejecutar:

```bash
cd backend-django
python manage.py importar_suscripciones --usuario <id_del_usuario>
```

### Pruebas automáticas

```bash
cd backend-django
pytest --cov=suscripciones
```

```bash
cd backend-node
npm test
```

Django tiene 61 pruebas (90 % de cobertura) y Node, 32. Ninguna necesita internet, Redis ni bases de datos reales. GitHub Actions las corre en cada push, junto con el build del frontend.

## Endpoints

En todas las rutas con token se envía `Authorization: Bearer <token>`.

### API Node (localhost:3000)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/registro` | Público (rate limit) | Crea un usuario. El rol siempre es USUARIO. |
| POST | `/api/auth/login` | Público (rate limit) | Devuelve access y refresh token. |
| POST | `/api/auth/refresh` | Refresh token | Canjea el refresh por un par nuevo (rotación). |
| POST | `/api/auth/logout` | Refresh token | Revoca el refresh. |
| GET / PATCH | `/api/auth/perfil` | Token | Ver o editar nombre y días de aviso. |
| GET / POST | `/api/proveedores` | Token | Listar o crear. |
| GET / PUT | `/api/proveedores/:id` | Token | Ver o actualizar. |
| PATCH | `/api/proveedores/:id/calificar` | Token | Califica del 1 al 5. |
| DELETE | `/api/proveedores/:id` | Token ADMIN | Borrado lógico. |
| GET | `/api/planes` | Token | Populate básico. |
| GET | `/api/planes/resumen` | Token | Populate con selección de campos. |
| GET | `/api/planes/detalle` | Token | Populate múltiple. |
| POST / PUT | `/api/planes`, `/api/planes/:id` | Token | Crear o actualizar. |
| DELETE | `/api/planes/:id` | Token ADMIN | Borrado lógico. |
| GET / POST / DELETE | `/api/paquetes` | Token | Paquetes propios, con populate anidado. |
| GET | `/api/historial/aumentos` | Token | Últimos aumentos del usuario. |
| GET | `/api/historial/:suscripcionId` | Token | Evolución del precio. |
| POST | `/api/historial/interno` | API key | Lo llama Django. |
| GET | `/api/usuarios/interno/buscar?email=` | API key | Lo llama Django para invitar a un grupo. |
| GET | `/api/notificaciones` | Token | Avisos del usuario. |
| GET | `/api/notificaciones/contador` | Token | Cantidad sin leer. |
| PATCH | `/api/notificaciones/:id/leida` | Token | Marca un aviso como leído. |
| PATCH | `/api/notificaciones/leer-todas` | Token | Marca todos como leídos. |
| POST | `/api/notificaciones/revisar` | Token ADMIN | Fuerza la revisión de cobros. |
| GET | `/api/cotizacion` | Token | Dólar tarjeta y oficial. |
| POST | `/api/ia/analizar` | Token (rate limit) | Analiza las suscripciones con Gemini. |
| GET | `/api/ia/ultimo` | Token | Último análisis guardado. |

Socket.IO: se conecta con `auth: { token }` y recibe `notificacion:nueva`.

### API Django (localhost:8000)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/register/` | Público | Crea una cuenta de Django. |
| POST | `/api/token/`, `/api/token/refresh/`, `/api/token/blacklist/` | Público | JWT de simplejwt con rotación y blacklist. |
| GET | `/accounts/google/login/`, `/api/auth/social/jwt/` | Sesión | Login con Google y canje por JWT. |
| GET / POST | `/api/suscripciones/` | Token | Lista paginada. Parámetros: `estado`, `categoria`, `grupo`, `solo_propias`, `incluir_canceladas`, `search`, `ordering`, `page`, `page_size`. |
| GET / PATCH / DELETE | `/api/suscripciones/{id}/` | Token | Dueño o miembro del grupo para leer; dueño o admin del grupo para modificar. |
| GET | `/api/suscripciones/proximos/?dias=30` | Token | Cobros próximos y atrasados. |
| GET | `/api/suscripciones/resumen/` | Token | Totales mensuales y anuales. |
| POST | `/api/suscripciones/{id}/registrar-pago/` | Token | Guarda el pago y avanza la fecha. |
| GET | `/api/suscripciones/{id}/pagos/` | Token | Pagos de una suscripción. |
| GET | `/api/pagos/`, `/api/pagos/por-mes/?meses=6` | Token | Pagos y totales por mes. |
| GET / POST / PATCH / DELETE | `/api/categorias/` | Leer: token. Modificar: ADMIN | Categorías compartidas. |
| GET / POST / PATCH / DELETE | `/api/etiquetas/` | Token | Etiquetas propias. |
| GET / POST / PATCH / DELETE | `/api/grupos/` | Token | Grupos del usuario. Modificar: admin del grupo. |
| POST | `/api/grupos/{id}/add-member/` | Admin del grupo | Agrega por username o email. |
| GET | `/api/grupos/{id}/summary/` | Miembro | Cantidades por estado y gasto mensual. |
| GET | `/api/feriados/` | Token | Feriados, con caché. |
| GET | `/api/internos/proximos-cobros/` | API key | Lo usa Node. |
| GET | `/api/health/`, `/api/health/version/` | Público | Estado del servicio. |
| POST | `/graphql/` | Token | Queries y mutations. |

WebSocket: `ws://localhost:8000/ws/grupos/{id}/?token=<JWT>`. Eventos: `presencia`, `suscripcion_creada`, `suscripcion_actualizada`, `pago_registrado`, `miembro_agregado`.

## La parte más difícil: las fechas de cobro

Están en `backend-django/suscripciones/fechas.py`. Si algo se cobra el día 31, en febrero se cobra el 28 (o 29), y en marzo vuelve al 31. La clave es calcular siempre desde el **día de cobro original** y no desde la fecha anterior; si no, después de febrero todos los cobros quedarían corridos al 28.

## Estructura

```
aldia/
├── .github/workflows/ci.yml
├── backend-django/       config, suscripciones (capas, consumers, GraphQL), tests, Dockerfile
├── backend-node/         index.js, src (config, models, controllers, routes, middlewares,
│                         services, sockets, utils, scripts), tests, Dockerfile
├── frontend/src/         services, context, components, pages, utils
├── docs/arquitectura.md
├── postman/              colección para probar los endpoints
├── spec.md, agent.md
└── docker-compose.yml
```
