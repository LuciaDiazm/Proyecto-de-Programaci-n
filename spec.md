# Especificación de Al Día (SDD)

## 1. Resumen y objetivo

Al Día permite cargar suscripciones y gastos fijos, saber cuándo se debita cada uno, recibir avisos antes del cobro, registrar pagos, seguir los aumentos de precio y compartir gastos en grupos. El sistema tiene dos APIs (Node + MongoDB y Django + PostgreSQL) y un frontend en React.

## 2. Alcance

Incluye: registro y login, suscripciones, pagos, categorías, etiquetas, proveedores con calificación, planes y paquetes, grupos con roles, avisos, historial de precios, cotización del dólar, feriados, tiempo real, GraphQL y asesor con IA.

No incluye: débito real de pagos, integración con bancos ni aplicación móvil.

## 3. Modelos

### API Node (MongoDB)

| Modelo | Campos principales | Relaciones |
|---|---|---|
| Usuario | nombre, email (único), password (bcrypt, oculto), rol (USUARIO/ADMIN), diasAviso | |
| RefreshToken | tokenHash (único), expira, revocado | usuario → Usuario |
| Proveedor | razonSocial (mayúsculas), cuit (11 dígitos, único), contacto{email, telefono}, categorias[], calificacion (1 a 5), activo | |
| Plan | nombre, precio, moneda, activo | proveedor → Proveedor, creadoPor → Usuario |
| Paquete | nombre | usuario → Usuario, planes[] → Plan |
| HistorialPrecio | suscripcionId, precioAnterior, precioNuevo, moneda, variacionPorcentual, tipo | usuario → Usuario |
| Notificacion | tipo, titulo, mensaje, leida, clave (única) | usuario → Usuario |

### API Django (PostgreSQL)

| Modelo | Campos principales | Relaciones |
|---|---|---|
| Categoria | nombre (único), color | |
| Etiqueta | usuario_id, nombre | |
| Grupo | nombre, descripcion, creado_por | |
| MembresiaGrupo | usuario_id, alias, rol (admin/miembro) | grupo → Grupo, único por grupo y usuario |
| Suscripcion | usuario_id, nombre, monto (Decimal), moneda, frecuencia, dia_cobro, fecha_inicio, proxima_fecha_cobro, estado | categoria → Categoria, grupo → Grupo, etiquetas ↔ Etiqueta |
| Pago | monto, moneda, cotizacion, fecha_pago, fecha_cobro | suscripcion → Suscripcion |
| SecurityLog | evento, usuario, ip, detalle, fecha | |

## 4. Endpoints

La lista completa, con acceso y descripción, está en el [README](README.md#endpoints) y en la colección de Postman.

## 5. Reglas de negocio y criterios de aceptación

| # | Regla | Respuesta si no se cumple |
|---|---|---|
| 1 | Toda ruta de datos exige un JWT válido. | 401 |
| 2 | El rol nunca viene del cliente: quien se registra siempre es USUARIO. | Se ignora el campo |
| 3 | El CUIT de un proveedor tiene exactamente 11 números y no se repite. | 400 |
| 4 | La calificación de un proveedor es un número del 1 al 5. | 400 |
| 5 | Borrar proveedores o planes exige rol ADMIN y el borrado es lógico. | 403 |
| 6 | Un usuario no puede ver ni tocar suscripciones ajenas fuera de sus grupos. | 404 |
| 7 | En un grupo, los admins editan y los miembros solo leen. | 403 |
| 8 | Cancelar una suscripción conserva sus pagos y su historial. | |
| 9 | Si algo se cobra el día 31, en meses más cortos se cobra el último día y el mes siguiente vuelve al 31. | |
| 10 | Un refresh token se usa una sola vez. Reutilizarlo cierra todas las sesiones del usuario. | 401 |
| 11 | Si la API externa falla, la API responde 502 o usa el dato en caché. | 502 |
| 12 | El WebSocket de un grupo rechaza a quien no es miembro. | Conexión cerrada |

## 6. Formato de error

API Node:

```json
{ "error": true, "mensaje": "Descripción del problema" }
```

API Django (convención de DRF, de la cursada de Django):

```json
{ "error": true, "detail": "Descripción del problema" }
```

Los errores 500 nunca exponen detalles internos.
