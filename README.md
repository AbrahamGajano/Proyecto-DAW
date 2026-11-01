# PorraGP · Proyecto DAW

Porra de Fórmula 1 con puntos ficticios. Entrega de Abraham: SQL de la semana 1
y autenticación de la semana 2. El juego, los perfiles y el correo todavía no están
implementados.

## Arranque de la parte de Abraham

Requisitos: Node.js 22 o posterior, npm y una base PostgreSQL disponible. Docker
Compose y la infraestructura general se integrarán con Álvaro; no se incluyen aquí.

1. Ejecutar `npm ci`.
2. Copiar `.env.example` a `.env` y poner la conexión real de PostgreSQL.
3. Generar un secreto con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
   y copiarlo en `SESSION_SECRET`. Mantener `.env` fuera de Git.
4. En una **base vacía**, ejecutar `npm run db:init` una sola vez. Si Álvaro ya ha
   integrado las tablas, omitir este paso. La FK a piloto se incorpora aparte.
5. Ejecutar `npm start` y abrir `http://localhost:3000`.

En PowerShell, la copia se hace con `Copy-Item .env.example .env`.
Si cambia el puerto, ajustar también `APP_ORIGIN`: debe coincidir con el origen
del navegador. Para desarrollo en HTTP, `COOKIE_SECURE=false`; para HTTPS, `true`.
La conexión debe poder crear la tabla de sesiones, que gestiona connect-pg-simple.

No hay cuentas predefinidas. Crear una desde `/registro.html` y entrar desde
`/login.html`. La portada permite comprobar y cerrar la sesión. Los administradores
se crearán con el seed de Álvaro, nunca mediante el registro público.

## Pruebas

```powershell
npm test
```

Pruebas HTTP con Vitest/Supertest: crean una BD PostgreSQL embebida y aislada con
PGlite por caso. Usan el SQL real y connect-pg-simple; no simulan las consultas de
usuarios/sesiones ni utilizan `DATABASE_URL`. Comprueban Argon2id, duplicados,
validación, sesiones, permisos, caducidad, cierre de sesión y errores.

Pruebas opcionales de navegador, tras descargar Chromium una vez:

```powershell
npx playwright install chromium
npm run test:ui
```

Cubren registro/login/logout en escritorio y móvil, navegación de teclado y
comprobaciones automáticas axe. No sustituyen una revisión manual completa de
accesibilidad ni la prueba final con el PostgreSQL de Docker de Álvaro.

## Estructura

- `server/auth.js`: rutas, validación, contraseñas y permisos compartidos.
- `server/app.js`: montaje Express, sesiones, protección de origen y errores.
- `server/index.js`: arranque mínimo con una conexión PostgreSQL.
- `public/`: portada y formularios HTML/CSS/JavaScript sin frameworks.
- `db/`: tablas de Abraham y enlace pendiente con los pilotos de Álvaro.
- `tests/`: pruebas de API y navegador.

Documentación:

- [Qué hace el código de la semana 2](docs/SEMANA_2_ABRAHAM.md).
- [Entrega para integrar con Álvaro o su IA](docs/INTEGRACION_ALVARO.md).
- [Contrato de autenticación](docs/contrato-auth.md).
- [SQL y orden de carga](db/README.md).
- [Plan y documentos originales](docs/README.md).
