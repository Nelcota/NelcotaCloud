SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

CREATE INDEX IF NOT EXISTS audit_events_failure_address_idx
    ON auth.audit_events (ip_address, occurred_at) INCLUDE (email)
    WHERE action = 'login_failed' AND ip_address IS NOT NULL;

DO $migration$
DECLARE
    extension_schema name;
BEGIN
    SELECT namespace.nspname INTO STRICT extension_schema
    FROM pg_extension AS extension
    JOIN pg_namespace AS namespace ON namespace.oid = extension.extnamespace
    WHERE extension.extname = 'pg_trgm';

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS audit_events_email_trgm_idx ON auth.audit_events USING gin (email %I.gin_trgm_ops) WHERE email IS NOT NULL',
        extension_schema
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS audit_events_ip_trgm_idx ON auth.audit_events USING gin (ip_address %I.gin_trgm_ops) WHERE ip_address IS NOT NULL',
        extension_schema
    );

    IF EXISTS (
        SELECT 1 FROM pg_index WHERE indexrelid IN (
            'auth.audit_events_failure_address_idx'::regclass,
            'auth.audit_events_email_trgm_idx'::regclass,
            'auth.audit_events_ip_trgm_idx'::regclass
        ) AND indisvalid = false
    ) THEN
        RAISE EXCEPTION 'audit search and summary indexes must be valid';
    END IF;
END
$migration$;
