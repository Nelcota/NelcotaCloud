SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

CREATE INDEX IF NOT EXISTS oauth_authorization_states_tenant_id_idx
    ON oauth_authorization_states (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_signing_keys_tenant_id_idx
    ON tenant_signing_keys (tenant_id);

DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_index
        WHERE indexrelid IN ('oauth_authorization_states_tenant_id_idx'::regclass,
                             'tenant_signing_keys_tenant_id_idx'::regclass)
          AND NOT indisvalid
    ) THEN
        RAISE EXCEPTION 'tenant cascade indexes must be valid';
    END IF;
END
$migration$;
