SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA auth;

DO $migration$
DECLARE
    extension_schema name;
BEGIN
    SELECT namespace.nspname INTO STRICT extension_schema
    FROM pg_extension AS extension
    JOIN pg_namespace AS namespace ON namespace.oid = extension.extnamespace
    WHERE extension.extname = 'pg_trgm';

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS users_email_trgm_idx ON auth.users USING gin (email %I.gin_trgm_ops)',
        extension_schema
    );

    IF NOT EXISTS (
        SELECT 1 FROM pg_index
        WHERE indexrelid = 'auth.users_email_trgm_idx'::regclass AND indisvalid
    ) THEN
        RAISE EXCEPTION 'users_email_trgm_idx must be valid';
    END IF;
END
$migration$;
