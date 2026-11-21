# Al Día · Control de suscripciones y gastos fijos

Proyecto final de Programación IV. Al Día sirve para cargar suscripciones y gastos fijos (Netflix, gimnasio, internet, seguros) y tenerlos bajo control:

- ver en un calendario qué día se debita cada uno;
- recibir avisos antes de cada cobro, en el momento, sin recargar la página;
- registrar los pagos y ver cuánto se gastó realmente cada mes;
- seguir los aumentos de precio de cada servicio;
- convertir los cobros en dólares con el dólar tarjeta del día;
- compartir gastos en grupos (familia, compañeros de casa) y ver quién está conectado;
- pedirle a un asesor con IA que sugiera qué revisar o cancelar.

Integrantes y acuerdos del equipo: [EQUIPO.md](EQUIPO.md). Especificación: [spec.md](spec.md). Contexto para agentes: [agent.md](agent.md). Decisiones de arquitectura: [docs/arquitectura.md](docs/arquitectura.md).

## Índice

1. [Cómo está armado](#cómo-está-armado)
2. [Qué hay que tener instalado](#qué-hay-que-tener-instalado)
3. [Cómo levantar todo](#cómo-levantar-todo)
   - [Opción A: backend con Docker](#opción-a-backend-con-docker)
   - [Opción B: todo sin Docker](#opción-b-todo-sin-docker)
4. [Comprobar que funciona](#comprobar-que-funciona)
5. [Usuario administrador y datos de ejemplo](#usuario-administrador-y-datos-de-ejemplo)
6. [Variables de entorno](#variables-de-entorno)
7. [Problemas frecuentes](#problemas-frecuentes)
8. [Frontend](#frontend)
9. [API de Django](#api-de-django)
10. [API de Node](#api-de-node)
11. [Pruebas automáticas](#pruebas-automáticas)
12. [Qué se ve de cada clase](#qué-se-ve-de-cada-clase)
13. [Estructura del repositorio](#estructura-del-repositorio)

## Cómo está armado

El proyecto tiene tres partes que se levantan por separado: un frontend en React y dos APIs, una en Node.js y otra en Django. El frontend usa las dos a la vez.

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
                                     (o SQLite)      (opcional)
```

| Parte | Qué guarda o hace | Por qué |
|---|---|---|
| API Node + MongoDB | Usuarios, login, proveedores, planes, historial de precios, avisos, análisis de IA, dólar | Registros que crecen con el tiempo y estructuras flexibles. |
| API Django + PostgreSQL | Suscripciones, pagos, categorías, etiquetas, grupos | Datos con relaciones fijas, montos exactos y cálculos por mes. |
| Redis | Reparte los mensajes en tiempo real de los grupos | Solo hace falta con Docker o en producción; en desarrollo Django usa la memoria. |

**Cómo se comunican**

1. **Un solo inicio de sesión para las dos APIs.** Node firma el token (JWT) al hacer login. Django lo valida con la misma clave `JWT_SECRET`. Por eso esa clave tiene que ser **idéntica** en los dos `.env`.
2. **Django → Node.** Al crear una suscripción o cambiarle el precio, Django le avisa a Node para que guarde el historial. Se identifica con `API_KEY_INTERNA`.
3. **Node → Django.** Cada hora Node le pregunta a Django qué cobros se acercan y genera los avisos. También usa `API_KEY_INTERNA`, que tiene que ser **idéntica** en los dos `.env`.

## Qué hay que tener instalado

| Programa | Versión | Para qué | Cómo comprobarlo |
|---|---|---|---|
| [Git](https://git-scm.com/downloads) | cualquiera reciente | Clonar el repositorio | `git --version` |
| [Node.js](https://nodejs.org/) | 20 o más nueva (el proyecto usa 24) | API de Node y frontend | `node --version` |
| [Python](https://www.python.org/downloads/) | 3.12 o más nueva | API de Django | `python --version` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | cualquiera reciente | Opción A, o solo para tener MongoDB | `docker --version` |
| [MongoDB Community](https://www.mongodb.com/try/download/community) | 7 | Opción B, si no se usa Docker | `mongod --version` |

Para la opción A alcanza con Git, Node y Docker. Para la opción B hacen falta Git, Node, Python y MongoDB (instalado o con Docker).

Primero, clonar el repositorio y entrar a la carpeta:

```bash
git clone https://github.com/LuciaDiazm/Proyecto-de-Programaci-n.git
cd Proyecto-de-Programaci-n
```

Todos los comandos de este README están escritos para la terminal de Windows (CMD o PowerShell). En Mac o Linux, `copy` se reemplaza por `cp` y `.venv\Scripts\activate` por `source .venv/bin/activate`.

## Cómo levantar todo

Hay dos formas. Las dos terminan igual: el frontend en `http://localhost:5173`, la API de Node en el puerto 3000 y la de Django en el 8000.

| | Opción A: backend con Docker | Opción B: todo sin Docker |
|---|---|---|
| Qué se instala | Docker Desktop | Python y MongoDB |
| Base de Django | PostgreSQL | SQLite (un archivo, no se instala nada) |
| Terminales abiertas | 2 (Docker y frontend) | 3 (Django, Node y frontend) |
| Conviene para | Probar todo junto, igual que en producción | Programar y ver los cambios al instante |

### Opción A: backend con Docker

Docker levanta las dos APIs, PostgreSQL, MongoDB y Redis con un solo comando. El frontend se corre aparte.

**1. Crear los dos archivos `.env.docker`**

Estos archivos **no vienen en el repositorio**: tienen claves, así que cada una los crea en su compu (Git los ignora). Se crean copiando el `.env.example` de cada API:

```bash
copy backend-django\.env.example backend-django\.env.docker
copy backend-node\.env.example backend-node\.env.docker
```

Después hay que abrir cada uno y dejarlo así. Son valores de ejemplo para usar en la compu, no en producción. Lo importante es que `JWT_SECRET` y `API_KEY_INTERNA` sean iguales en los dos, y que las direcciones usen los nombres de los servicios de Docker (`db`, `mongo`, `redis`, `node`, `web`) en lugar de `localhost`.

`backend-django/.env.docker`:

```env
DEBUG=False
COOKIES_SEGURAS=False
SECRET_KEY=clave-solo-para-docker-local-0123456789-abcdef
ALLOWED_HOSTS=localhost,127.0.0.1,web
DB_ENGINE=postgresql
DB_NAME=aldia
DB_USER=aldia
DB_PASSWORD=aldia123
DB_HOST=db
DB_PORT=5432
REDIS_URL=redis://redis:6379
JWT_SECRET=clave-jwt-solo-para-docker-local-0123456789
JWT_ISSUER=aldia-auth
API_KEY_INTERNA=clave-interna-solo-para-docker-local
NODE_API_URL=http://node:3000
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:8000
```

`backend-node/.env.docker`:

```env
PORT=3000
MONGO_URI=mongodb://mongo:27017/aldia
JWT_SECRET=clave-jwt-solo-para-docker-local-0123456789
JWT_EXPIRATION=8h
JWT_ISSUER=aldia-auth
API_KEY_INTERNA=clave-interna-solo-para-docker-local
DJANGO_API_URL=http://web:8000
CORS_ORIGINS=http://localhost:5173
```

`DB_USER`, `DB_PASSWORD` y `DB_NAME` tienen que coincidir con los de PostgreSQL en `docker-compose.yml` (`aldia` / `aldia123` / `aldia`).

**2. Levantar el backend** (con Docker Desktop abierto)

```bash
docker compose up --build
```

La primera vez tarda unos minutos porque descarga las imágenes. Está listo cuando aparecen las líneas `Listening on TCP address 0.0.0.0:8000` (Django) y `Servidor HTTP y WebSockets listo` (Node). Las migraciones de Django se aplican solas. Esta terminal queda ocupada: no hay que cerrarla.

**3. Levantar el frontend** (en otra terminal, desde la carpeta del proyecto)

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Abrir `http://localhost:5173`.

Para apagar todo: `Ctrl + C` en cada terminal y después `docker compose down`. Los datos quedan guardados para la próxima vez. Para borrarlos también: `docker compose down -v`.

### Opción B: todo sin Docker

Se usan tres terminales, una para cada parte. El orden importa: **primero Django, después Node y al final el frontend**, porque Node le consulta los cobros a Django y el frontend usa las dos APIs.

**0. Preparar las claves compartidas y MongoDB**

Generar dos claves largas. Este comando muestra una clave al azar cada vez que se ejecuta:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

- La primera es `JWT_SECRET`.
- La segunda es `API_KEY_INTERNA`.

Las dos se pegan **iguales** en el `.env` de Django y en el de Node.

MongoDB tiene que estar corriendo. Si está instalado, Windows lo inicia solo como servicio. Si no, se puede levantar solo MongoDB con Docker:

```bash
docker compose up -d mongo
```

**1. API de Django** (terminal 1)

```bash
cd backend-django
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Abrir `backend-django/.env` y completar:

- `SECRET_KEY`: una tercera clave larga (se puede generar con el mismo comando).
- `JWT_SECRET` y `API_KEY_INTERNA`: las del paso 0.

El resto ya viene listo para usar SQLite. Después:

```bash
python manage.py migrate
daphne -p 8000 config.asgi:application
```

Está listo cuando aparece `Listening on TCP address 127.0.0.1:8000`. Esta terminal queda ocupada.

Las próximas veces alcanza con entrar a `backend-django`, activar el entorno (`.venv\Scripts\activate`) y correr el último comando.

**2. API de Node** (terminal 2)

```bash
cd backend-node
npm install
copy .env.example .env
```

Abrir `backend-node/.env` y completar `JWT_SECRET` y `API_KEY_INTERNA` con las del paso 0. Si MongoDB está en otra dirección, cambiar también `MONGO_URI`. Después:

```bash
npm run dev
```

Está listo cuando aparecen `Base de datos conectada: aldia` y `Servidor HTTP y WebSockets listo en http://localhost:3000`. Esta terminal queda ocupada.

**3. Frontend** (terminal 3)

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Abrir `http://localhost:5173`.

## Comprobar que funciona

1. `http://localhost:8000/api/health/` responde `{"status": "ok", ...}`: Django está bien.
2. `http://localhost:5173` muestra la pantalla de ingreso: el frontend está bien.
3. Crear una cuenta en **Creá tu cuenta**. Si entra al panel, Node funciona y el login también.
4. Agregar una suscripción. Si aparece en el panel, Django acepta el token de Node: la `JWT_SECRET` es la misma en los dos.
5. En el panel, abajo a la izquierda, tiene que aparecer el **Dólar tarjeta**: Node pudo consultar la API externa.

Si algún paso falla, ver [Problemas frecuentes](#problemas-frecuentes).

## Usuario administrador y datos de ejemplo

**Crear un administrador.** Las cuentas nuevas siempre son de rol USUARIO. Un ADMIN puede además crear categorías, borrar proveedores y forzar la revisión de cobros. Se crea con:

```bash
cd backend-node
npm run crear-admin -- admin@aldia.com Admin1234 "Administrador"
```

Con Docker: `docker compose exec node npm run crear-admin -- admin@aldia.com Admin1234 "Administrador"`.

Después hay que cerrar sesión y volver a entrar con esa cuenta.

**Cargar suscripciones de ejemplo.** Primero hay que crear una cuenta desde el frontend y averiguar su id: con la sesión iniciada, abrir las herramientas del navegador (F12), pestaña **Application** → **Local Storage** → `http://localhost:5173` → `usuario`, y copiar el valor de `_id`. Después:

```bash
cd backend-django
python manage.py importar_suscripciones --usuario <id_del_usuario>
```

Con Docker: `docker compose exec web python manage.py importar_suscripciones --usuario <id_del_usuario>`.

Importa los archivos de `backend-django/data` (JSON, CSV y XML). Las categorías ya vienen cargadas desde la primera migración.

## Variables de entorno

Cada parte tiene su `.env.example` con todas las variables y un comentario. Los `.env` y `.env.docker` reales **nunca se suben** al repositorio.

**Frontend** (`frontend/.env`)

| Variable | Para qué | Valor en desarrollo |
|---|---|---|
| `VITE_NODE_URL` | Dirección de la API de Node | `http://localhost:3000` |
| `VITE_DJANGO_URL` | Dirección de la API de Django | `http://localhost:8000` |

**Las que se repiten en las dos APIs**

| Variable | Regla |
|---|---|
| `JWT_SECRET` | **Igual** en Node y en Django. Si no, Django rechaza el token y todo lo de suscripciones da error 401. |
| `JWT_ISSUER` | Igual en las dos (`aldia-auth`). |
| `API_KEY_INTERNA` | **Igual** en las dos. Si no, no se guarda el historial de precios ni se generan avisos. |

Las demás variables de cada API se explican en su sección: [Django](#api-de-django) y [Node](#api-de-node).

## Problemas frecuentes

| Qué pasa | Por qué | Cómo se arregla |
|---|---|---|
| El frontend dice "No se pudo conectar con el servidor" | Alguna API no está corriendo | Revisar que las terminales de Django y Node sigan abiertas y sin errores. |
| Se puede entrar, pero las suscripciones dan error o vuelve al login | `JWT_SECRET` distinta en los dos `.env` | Copiar la misma clave en los dos y reiniciar las APIs. |
| Node muestra un error de conexión a MongoDB | MongoDB no está corriendo | Iniciarlo (servicio de Windows) o `docker compose up -d mongo`. |
| `docker compose up` dice que no encuentra `.env.docker` | Ese archivo no viene en el repositorio | Crearlo como en el paso 1 de la [opción A](#opción-a-backend-con-docker). |
| `port is already allocated` o `EADDRINUSE` | Otro programa usa el puerto 3000, 8000 o 5173 | Cerrar el otro programa, o la otra forma de levantar el proyecto (no correr la A y la B a la vez). |
| Con Docker, `mongo` no arranca y dice `port is already allocated` en el 27017 | Hay un MongoDB instalado en la compu que ya usa ese puerto | Pausarlo antes de `docker compose up`: en Windows, abrir **Servicios**, buscar **MongoDB Server** y tocar **Detener**. Al terminar, se vuelve a iniciar desde el mismo lugar. Lo mismo pasa con PostgreSQL (5432) o Redis (6379) si están instalados. |
| PowerShell no deja ejecutar `.venv\Scripts\activate` | La política de scripts de Windows lo bloquea | Usar la terminal CMD, o correr antes `Set-ExecutionPolicy -Scope Process Bypass` (vale solo para esa ventana). |
| Error de CORS en la consola del navegador | El frontend no corre en `http://localhost:5173` | Usar esa dirección, o agregar la nueva en `CORS_ORIGINS` (Node) y `CORS_ALLOWED_ORIGINS` (Django). |
| No aparece el dólar tarjeta | La API externa (dolarapi.com) no respondió | No afecta al resto. Los montos en dólares se muestran sin convertir. |
| El asesor con IA da error | Falta `GEMINI_API_KEY` en el `.env` de Node | Es opcional. Conseguir una clave gratis en [Google AI Studio](https://aistudio.google.com/apikey). |

## Frontend

Hecho con React 19 y Vite. Sigue la arquitectura por capas del Módulo 5:

| Carpeta | Qué tiene |
|---|---|
| `src/services/` | Las únicas que hablan con las APIs. `api.js` crea una instancia de Axios para cada API con el interceptor que agrega el token. Hay un servicio por entidad (`suscripcionService.js`, `proveedorService.js`, etc.) con funciones exportadas como `obtenerSuscripciones` o `crearProveedor`. |
| `src/components/` | Piezas visuales que reciben datos por props: `ProveedorCard`, `FilaCobro`, `Modal`, `Toast`, `Sello`. `ProtectedRoute` protege las rutas. |
| `src/pages/` | Una pantalla por ruta. Cada página guarda sus datos con `useState` y los carga con `useEffect`. |
| `src/App.jsx` | El mapa de rutas. Todas las pantallas, salvo ingreso y registro, están dentro de `ProtectedRoute`. |

**Sesión.** Al iniciar sesión se guardan en `localStorage` el token y los datos del usuario (nombre y rol, para mostrar el menú y proteger la ruta de ADMIN). Cerrar sesión los borra. Si el token vence, la API responde 401 y la app vuelve sola al ingreso.

**Tiempo real.** Los avisos llegan por Socket.IO desde Node (`services/socket.js`). Los cambios de los grupos llegan por WebSocket desde Django (`services/tiempoReal.js`), que se reconecta solo si se corta.

**Comandos** (dentro de `frontend`):

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el frontend en `http://localhost:5173` y recarga al guardar. |
| `npm run build` | Genera la versión final en `dist/`. |
| `npm run preview` | Sirve esa versión final para probarla. |

## API de Django

> **Sección a cargo de Marianela.** Tiene que incluir: instalación, variables del `.env`, migraciones, datos de ejemplo, cómo correr las pruebas y la cobertura, Docker, WebSocket (Channels) y GraphQL, y la tabla de endpoints.

## API de Node

> **Sección a cargo de Melina.** Tiene que incluir: instalación, variables del `.env`, cómo crear el admin, cómo probar el login, el JWT y las rutas protegidas con la colección de Postman (`postman/`), las pruebas y Socket.IO, y la tabla de endpoints.

## Pruebas automáticas

| Parte | Comando | Detalle |
|---|---|---|
| Django | `cd backend-django` y `pytest --cov=suscripciones` | [API de Django](#api-de-django) |
| Node | `cd backend-node` y `npm test` | [API de Node](#api-de-node) |
| Frontend | `cd frontend` y `npm run build` | Comprueba que compile. |

Ninguna prueba necesita internet ni bases de datos reales. GitHub Actions corre todo en cada push (`.github/workflows/ci.yml`).

## Qué se ve de cada clase

| Tema | Dónde está |
|---|---|
| ES Modules, clases, `#privados`, herencia, getters/setters, errores propios | `backend-node/src/utils/Monto.js` y `errores.js` |
| Estructura `index.js`, `src/app.js`, `src/server.js`, `conectarBD` | `backend-node` |
| Mongoose, CRUD completo, `populate` básico, con selección, múltiple y anidado | `Proveedor`, `Plan`, `Paquete` |
| JWT con vencimiento, roles, validaciones, rate limit, helmet, CORS, API externa con 502 | `backend-node/src/middlewares`, `services` |
| Socket.IO y puente con Firebase | `backend-node/src/sockets` |
| Jest + Supertest con mocks, caminos felices y de error | `backend-node/tests` |
| Arquitectura por capas, Axios con interceptor, servicios, rutas protegidas, CRUD en React | `frontend/src/services`, `components/ProtectedRoute.jsx`, `pages/Proveedores.jsx` |
| SDD | `spec.md`, `agent.md` |
| Importación de archivos y logging | `backend-django/suscripciones/management/commands/importar_suscripciones.py` |
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

**La parte más difícil: las fechas de cobro.** Están en `backend-django/suscripciones/fechas.py`. Si algo se cobra el día 31, en febrero se cobra el 28 (o 29) y en marzo vuelve al 31. La clave es calcular siempre desde el **día de cobro original** y no desde la fecha anterior; si no, después de febrero todos los cobros quedarían corridos al 28.

## Estructura del repositorio

```
Proyecto-de-Programaci-n/
├── .github/workflows/ci.yml   pruebas automáticas en cada push
├── backend-django/            API de Django: config, suscripciones, tests, data, Dockerfile
├── backend-node/              API de Node: index.js, src, tests, Dockerfile
├── frontend/                  React: src/services, components, pages, utils
├── docs/                      arquitectura y reporte de cobertura
├── postman/                   colección para probar los endpoints
├── docker-compose.yml         levanta el backend completo
├── EQUIPO.md                  integrantes, acuerdos y planificación
├── spec.md                    especificación
└── agent.md                   contexto para agentes
```
