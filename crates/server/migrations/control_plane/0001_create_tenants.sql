CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    database_url_ciphertext BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_api_keys (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('publishable', 'secret')),
    key_hash BYTEA NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX tenant_api_keys_tenant_id_idx ON tenant_api_keys (tenant_id);

CREATE TABLE tenant_signing_keys (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    private_key_ciphertext BYTEA NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one key signs new tokens; older keys stay published in the JWKS until tokens expire.
CREATE UNIQUE INDEX tenant_signing_keys_one_active_idx
    ON tenant_signing_keys (tenant_id) WHERE is_active;
