CREATE TABLE project_caches (
    tenant_id UUID PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL,
    generation UUID NOT NULL
);

CREATE TABLE project_cache_credentials (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES project_caches (tenant_id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
    token_hash BYTEA NOT NULL CHECK (octet_length(token_hash) = 32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX project_cache_credentials_tenant_id_idx ON project_cache_credentials (tenant_id);
