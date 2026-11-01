-- La funcionalidad de recuperación se implementa en la semana 4; aquí solo su tabla.
BEGIN;

CREATE TABLE recuperacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    caduca_en TIMESTAMPTZ NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT recuperacion_usuario_fk FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    -- Propuesta de formato: SHA-256 hexadecimal del token aleatorio, nunca el token.
    CONSTRAINT recuperacion_hash_formato CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX recuperacion_usuario_idx ON recuperacion (usuario_id);

-- Caducidad y uso único se comprueban al consumir el token en una transacción.
COMMIT;
