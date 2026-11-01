-- INTEGRACIÓN MANUAL: ejecutar SOLO después de crear usuario Y piloto.
-- Supone que Álvaro utiliza piloto(id) y un identificador compatible con BIGINT.
-- Si acuerda otros nombres o tipos, ajustar esta referencia y piloto_favorito_id.
BEGIN;

ALTER TABLE usuario
    ADD CONSTRAINT usuario_piloto_favorito_fk
    FOREIGN KEY (piloto_favorito_id) REFERENCES piloto (id)
    ON DELETE SET NULL;

COMMIT;
