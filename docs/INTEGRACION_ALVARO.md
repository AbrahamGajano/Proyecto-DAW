# Entrega de Abraham · semanas 1 y 2

Puedes pasar este archivo a la IA de Álvaro junto con el repositorio. Describe el
estado real y no cambia las instrucciones globales de otras herramientas.

## Ya preparado por Abraham

- [x] Documentos originales conservados en `docs/`.
- [x] SQL de `usuario` y `recuperacion`; enlace a piloto en un fichero separado.
- [x] Registro, login, logout y consulta del usuario de sesión.
- [x] Contraseñas Argon2id y validación con Zod; el registro no admite rol admin.
- [x] Sesiones express-session guardadas en PostgreSQL mediante connect-pg-simple.
- [x] `requireAuth` y `requireAdmin`, con el usuario actual en `req.user`.
- [x] Pantallas de registro e inicio de sesión con errores junto a los campos.
- [x] Portada mínima para comprobar la sesión y cerrarla.
- [x] Pruebas HTTP aisladas y pruebas de navegador para escritorio/móvil.
- [x] Verificación: 25 pruebas API y 2 recorridos Chromium correctos, sin incidencias
      en las comprobaciones axe incluidas. No equivale a una auditoría completa.
- [x] Arranque mínimo Express y script para crear solo las tablas de Abraham.

## Integración que necesita Álvaro

- [ ] Revisar nombres y tipos del esquema: singular, snake_case, IDs BIGINT y
      favorito opcional. SQL en `db/abraham/`; se aplica una sola vez.
- [ ] Integrar la FK `db/integrations/usuario_piloto.sql` cuando exista `piloto(id)`.
- [ ] Incorporar esta entrega a su Docker y PostgreSQL real. No hay Compose aquí.
- [ ] Revisar `docs/contrato-auth.md`: es el contrato implementado por Abraham,
      pendiente de aceptación o adaptación conjunta con el equipo.
- [ ] Reutilizar una única conexión `pg.Pool`. Pasarla a `createApp` de
      `server/app.js`; no montar dos middlewares de sesión ni dos servidores.
- [ ] Añadir las rutas del resto mediante `configureRoutes` (ejemplo abajo) o
      trasladar el montaje a su app conservando el orden: JSON, sesión, rutas, errores.
- [ ] Conservar `req.user.id`, `req.user.rol` y `req.session.usuarioId` como contrato
      compartido. Los IDs de la API son cadenas por compatibilidad con BIGINT.
- [ ] Adaptar las pantallas al CSS/cabecera/menú comunes. `public/css/auth.css` es
      un estilo local para esta entrega, no una nueva base de diseño obligatoria.
- [ ] Sustituir `public/js/auth-api.js` por su fetch común si procede: gestionar
      JSON, errores por campo, cookies del mismo origen y respuestas 204 sin cuerpo.
- [ ] Coordinar el seed admin con hash Argon2id, sin credenciales reales en Git.
- [ ] Integrar ESLint, Prettier, CI y README general de su infraestructura.
- [ ] Ejecutar las pruebas y el flujo manual contra el PostgreSQL real de Docker.

## Ejemplo para conectar otras rutas

```js
const app = await createApp({
  pool, // conexión compartida de Álvaro
  sessionSecret: process.env.SESSION_SECRET,
  appOrigin: process.env.APP_ORIGIN,
  configureRoutes(app, { requireAuth, requireAdmin }) {
    app.get('/api/ejemplo', requireAuth, (req, res) => {
      res.json({ data: { usuarioId: req.user.id } });
    });
    // Operaciones de admin: requireAuth, requireAdmin, controlador.
  },
});
```

`createRequireAuth(pool)` y `requireAdmin` también se exportan desde
`server/auth.js` para montarlos en otra app con sesión ya configurada.
La comprobación de propietario, grupos y visibilidad sigue siendo de cada ruta.

## Entorno y límites

`DATABASE_URL`, `SESSION_SECRET`, `APP_ORIGIN` y el resto están en `.env.example`.
No subir `.env`. APP_ORIGIN debe coincidir con el navegador; no hay CORS habilitado.
Las operaciones que modifican datos requieren Content-Type application/json,
incluido logout (`{}`), y rechazan otros orígenes.

Si el despliegue futuro usa un proxy HTTPS, Álvaro deberá configurar de forma
explícita qué proxy confía Express antes de usar cookies Secure. El arranque actual
es para HTTP local directo. El límite de intentos es local al proceso (50 cada
15 minutos por IP para registro/login), suficiente para esta ejecución local.

## Fuera de estas semanas

- Semana 3: perfiles y componentes comunes; Alex aportará puntos/posición.
- Semana 4: recuperación por correo, tokens y pantallas. La tabla ya existe.
- El juego, las tablas ajenas, el calendario y las clasificaciones son del resto.

## Contexto breve para otra IA

Integra la entrega de Abraham de semanas 1 y 2 en PorraGP. Ya hay SQL de usuario y
recuperación, autenticación funcional, sesiones PostgreSQL, permisos y dos formularios.
Lee `README.md`, `docs/contrato-auth.md` y `db/README.md`. El servidor y la portada
son mínimos para probar esta entrega: reutilízalos o integra sus módulos en la base
común, evitando duplicar sesiones y conexiones. Quedan Docker, esquema de pilotos,
base visual, seed admin y CI de Álvaro. No se han implementado perfiles ni correo.
Las pruebas usan PostgreSQL embebido aislado; falta verificar el Docker real.
