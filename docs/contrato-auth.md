# Contrato de autenticación · entrega de Abraham

Preparado en la semana 1 e implementado en la semana 2. Las rutas siguen el plan;
los nombres de campos y envoltorios son las convenciones de esta entrega, pendientes
de revisar con el equipo al integrar.

## Convenciones

- Peticiones y respuestas JSON, campos en camelCase; SQL en snake_case.
- IDs como cadenas decimales (ejemplo: `"1"`), compatibles con BIGINT de PostgreSQL.
- Éxito con datos: `{ "data": ... }`. Respuestas 204 sin cuerpo.
- Usuario de autenticación: `id`, `nombreUsuario`, `rol`, `pilotoFavoritoId`.
  Nunca enviar el hash. No es el perfil público, que se hará en la semana 3.
- Recortar espacios exteriores de nombre/email antes de validar. Unicidad sin
  distinguir mayúsculas, como en los índices SQL. No recortar la contraseña.
- Contraseña: 8–128 caracteres, guardada con Argon2id. Validación en
  cliente y servidor. El servidor también valida formato de email y nombre 1–50.

## Semana 2

| Método y ruta | Entrada | Éxito | Errores previstos |
| --- | --- | --- | --- |
| POST /api/auth/registro | nombreUsuario, email, contrasena | 201, data con usuario; no inicia sesión automáticamente | 400 inválido, 409 duplicado |
| POST /api/auth/login | email, contrasena | 200, data con usuario y cookie de sesión | 400 entrada inválida, 401 credenciales incorrectas |
| POST /api/auth/logout | Sin cuerpo | 204; destruir sesión y limpiar cookie, también si ya no había sesión | 500 si falla el almacenamiento |
| GET /api/auth/yo | Sin cuerpo | 200, data con usuario | 401 sin sesión |

Registro solo admite los campos documentados: rechazar `rol` u otros campos ajenos
con 400. Asignar siempre `usuario` en el servidor. El administrador se crea por seed.
En login, usar el mismo error genérico si el email no existe o la contraseña falla.

Ejemplo de usuario autenticado:

```json
{
  "data": {
    "id": "1",
    "nombreUsuario": "Abraham",
    "rol": "usuario",
    "pilotoFavoritoId": null
  }
}
```

## Sesión y permisos compartidos

- express-session con almacenamiento PostgreSQL mediante connect-pg-simple.
- Se guarda `usuarioId` en sesión y se carga el usuario actual en `req.user`.
  `req.user.id` y `req.user.rol` estarán disponibles para las rutas protegidas.
- Regenerar el identificador de sesión al iniciar sesión; guardar antes de responder.
- Cookie HttpOnly y SameSite=Lax; Secure cuando se sirva mediante HTTPS.
- Secreto de sesión y credenciales solo en variables de entorno, nunca en Git.
- `requireAuth`: 401 si no hay sesión válida o el usuario ya no existe.
- `requireAdmin`: aplicar tras requireAuth; 403 si el rol no es admin.
- Los controles de propiedad, grupos y visibilidad son de las rutas de cada parte.
- Las operaciones que modifican datos exigen JSON y comprueban Origin y
  Sec-Fetch-Site. No se habilita CORS. Logout también necesita JSON, por ejemplo `{}`.

Implementación en `server/auth.js` y `server/app.js`. El arranque mínimo está en
`server/index.js`; Álvaro puede integrarlo en su infraestructura. La tabla de sesiones
la crea connect-pg-simple, sin SQL manual. El registro no inicia sesión: después se
usa login. Las sesiones caducan a las 8 horas de inactividad.

## Errores comunes propuestos

```json
{
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Revisa los campos indicados.",
    "campos": {
      "email": "Introduce un email válido."
    }
  }
}
```

`campos` es opcional. No devolver SQL, trazas, contraseñas, hashes ni cookies.
El módulo fetch de Álvaro deberá tratar errores con y sin `campos`, y respuestas 204.

| HTTP | Significado |
| --- | --- |
| 400 | Datos inválidos o incompletos |
| 401 | Sin sesión válida o credenciales incorrectas |
| 403 | Autenticado, sin permiso |
| 404 | No existe o no se puede revelar |
| 409 | Duplicado o conflicto con el estado actual |
| 413 | Cuerpo de petición superior a 16 KB |
| 429 | Más de 50 intentos por IP en 15 minutos entre registro y login |
| 500 | Fallo inesperado; mensaje genérico y detalle solo en logs |

## Reservado para semanas posteriores

Se mantienen las rutas del plan, sin desarrollar todavía:

- Semana 3: GET /api/usuarios/:id, PATCH /api/usuarios/yo,
  PUT /api/usuarios/yo/contrasena; acordar la temporada para puntos y posición con Alex.
- Semana 4: POST /api/auth/recuperar y POST /api/auth/restablecer.
  Propuesta: token aleatorio, SHA-256 hexadecimal almacenado, duración de una hora,
  consumo atómico de un solo uso. La respuesta de recuperar será idéntica exista o
  no el email. Nodemailer y Mailpit se conectarán entonces.

Las decisiones de longitud, formato, sesión y JSON requieren aceptación del equipo;
este documento describe lo que ya implementa la entrega para poder integrarlo.
