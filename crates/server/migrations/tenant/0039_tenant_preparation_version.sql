-- Published by the API only after migrations and runtime grants have completed.
ALTER TABLE auth.tenant_identity
    ADD COLUMN prepared_through bigint NOT NULL DEFAULT 0,
    ADD COLUMN authenticator_fingerprint text;

REVOKE SELECT ON auth.tenant_identity FROM PUBLIC;
GRANT SELECT (singleton, tenant_id, prepared_through) ON auth.tenant_identity TO PUBLIC;
