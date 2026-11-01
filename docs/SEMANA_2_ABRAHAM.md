# Semana 2 de Abraham: explicación breve

## Qué hace cada pieza

1. **Registro**: el formulario envía nombre, email y contraseña. El servidor valida
   los datos, transforma la contraseña con Argon2id y guarda la cuenta en PostgreSQL.
   El hash sirve para comprobar la contraseña sin guardar el texto original.
2. **Login**: compara la contraseña con ese hash. Si coincide, crea una sesión en
   PostgreSQL y envía al navegador una cookie con un identificador firmado.
3. **Sesión**: el navegador envía la cookie en las siguientes peticiones. El servidor
   busca la sesión y obtiene el identificador del usuario. No guarda la contraseña
   ni los datos privados dentro de la cookie.
4. **`/api/auth/yo`**: devuelve quién ha iniciado sesión. La portada lo usa para
   enseñarte un saludo y el botón de salir.
5. **Logout**: borra la sesión del servidor y limpia la cookie. Aunque alguien
   reutilizase la cookie anterior, ya no tendría una sesión válida.
6. **Permisos**: requireAuth comprueba que hay un usuario; requireAdmin comprueba
   que además su rol actual es admin. Tus compañeros los reutilizan en sus rutas.

## Dónde mirar para entenderlo

- `server/auth.js`: empezar por las cuatro rutas, luego leer validación y permisos.
- `server/app.js`: cómo se conectan Express, sesiones y gestión de errores.
- `public/registro.html` y `public/login.html`: formularios, etiquetas y campos.
- `public/js/form-auth.js`: validar, enviar con fetch y mostrar éxito/error.
- `tests/auth.test.js`: ejemplos reales de peticiones y de lo que se espera.

Las consultas SQL usan `$1`, `$2`, etc., con los valores enviados aparte: así los
datos del usuario no se convierten en instrucciones SQL. El rol no se toma del
formulario: se asigna siempre `usuario` al registrar.

## Cómo enseñarlo

Tras arrancar siguiendo el README:

- Crear una cuenta e iniciar sesión; aparecerá un saludo en la portada.
- Recargar la página: la sesión continúa.
- Cerrar sesión: desaparece el saludo y vuelven los enlaces de acceso.
- Intentar repetir nombre/email: se muestra el error del campo.
- Intentar entrar con contraseña incorrecta: se muestra un error genérico.
- Ejecutar `npm test` para verificar también permisos y estado de la BD.

Las pruebas no utilizan tus datos de desarrollo. El navegador se comprueba aparte
con `npm run test:ui`, después de instalar Chromium según el README.

Verificación de esta entrega: 25 pruebas de API y 2 recorridos en Chromium
(escritorio/móvil) correctos; las comprobaciones axe A/AA incluidas no detectaron
incidencias. Se comprobaron además sintaxis JavaScript y formato del diff.

## Qué queda pendiente

Álvaro integra Docker, la tabla de pilotos, el seed admin y la base común del front.
Esta entrega incluye el servidor mínimo necesario para ejecutar tu autenticación.
No incluye perfiles, recuperación por correo ni el juego: van después en el plan.
