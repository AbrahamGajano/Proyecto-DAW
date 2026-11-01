-- Ejecutar antes de RECUPERACION. No depende de las tablas de otros compañeros.
BEGIN;

CREATE TABLE usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL,
    email VARCHAR(254) NOT NULL,
    contrasena_hash TEXT NOT NULL,
    rol VARCHAR(10) NOT NULL DEFAULT 'usuario',
    piloto_favorito_id BIGINT,
    fecha_alta TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT usuario_nombre_valido CHECK (
        nombre_usuario = BTRIM(nombre_usuario) AND nombre_usuario <> ''
    ),
    CONSTRAINT usuario_email_valido CHECK (
        email = BTRIM(email) AND email <> ''
    ),
    CONSTRAINT usuario_hash_no_vacio CHECK (BTRIM(contrasena_hash) <> ''),
    CONSTRAINT usuario_rol_valido CHECK (rol IN ('usuario', 'admin'))
);

-- Propuesta: las mayúsculas no distinguen cuentas (Ana y ana son el mismo nombre).
CREATE UNIQUE INDEX usuario_nombre_unico ON usuario (LOWER(nombre_usuario));
CREATE UNIQUE INDEX usuario_email_unico ON usuario (LOWER(email));

-- La FK de piloto favorito se añade al integrar PILOTO: ver integrations/.
COMMIT;
