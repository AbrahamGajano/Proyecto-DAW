# SQL de Abraham · semana 1

SQL para PostgreSQL, sin ORM. No hay contraseñas de ejemplo ni datos reales.

## Orden

1. Ejecutar `abraham/010_usuario.sql`.
2. Ejecutar `abraham/020_recuperacion.sql`.
3. Cuando exista la tabla `piloto` de Álvaro, ejecutar
   `integrations/usuario_piloto.sql`, revisando antes sus nombres y tipos.

Cada fichero usa una transacción. Están pensados para una base vacía: se aplican
una vez, no en cada arranque. No borran ni sustituyen tablas existentes.
Álvaro puede incorporarlos a su sistema de inicialización conservando este orden.
No se debe montar toda la carpeta `db` esperando que Docker recorra subcarpetas.

Ejemplo, cuando haya una conexión configurada en `DATABASE_URL` y `psql` instalado:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f db/abraham/010_usuario.sql
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f db/abraham/020_recuperacion.sql
# Solo tras crear piloto:
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f db/integrations/usuario_piloto.sql
```

## Decisiones de esta entrega

- Nombres SQL en singular y `snake_case`; identificadores `BIGINT` con identidad.
  `pg` suele entregar los BIGINT como cadenas: propuesta para la API, IDs en JSON
  como cadenas decimales, sin convertirlos sin control a Number.
- Usuario sin puntos almacenados: los puntos y posiciones pertenecen a Alex.
- Favorito opcional: `NULL` si no se ha elegido. La FK se añade al integrar pilotos;
  hasta entonces la BD no comprueba que el piloto exista. Un borrado permitido de
  un piloto deja el favorito en `NULL`.
- Nombre y email únicos ignorando mayúsculas; nombre de hasta 50 caracteres.
  La validación completa del email y de la contraseña corresponde al servidor.
- `contrasena_hash` guarda Argon2id desde el registro de `server/auth.js` (semana 2).
- Recuperación preparada para un hash SHA-256 hexadecimal de 64 caracteres.
  Guardar un hash no implementa por sí solo la caducidad ni el uso único.
- Las sesiones las gestiona `connect-pg-simple` desde la semana 2. No se crea aquí
  una tabla manual que pueda chocar con la librería; el servidor la crea al usarla.

Son convenciones propuestas para integrar con el equipo, no acuerdos ya confirmados.

## Comprobación realizada

El 1 de noviembre de 2026 se ejecutaron los tres ficheros en PostgreSQL embebido
con PGlite: 17 comprobaciones correctas sobre creación, valores por defecto,
duplicados sin distinguir mayúsculas, campos vacíos, roles, formato y unicidad del
hash de recuperación, claves foráneas y comportamiento al borrar usuario/piloto.
La tabla piloto usada fue una tabla mínima de prueba, fuera del repositorio.

Queda probar la integración con el esquema real y el PostgreSQL de Docker de
Álvaro cuando estén disponibles. Esta comprobación validó las restricciones SQL.
La autenticación de la semana 2 tiene además sus pruebas en `tests/`; la
recuperación por correo todavía no está implementada.
