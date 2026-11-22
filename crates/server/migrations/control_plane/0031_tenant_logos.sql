-- A project's logo, stored as the server re-encoded it: a 256px square JPEG without metadata.
CREATE TABLE tenant_logos (
    tenant_id UUID PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
    image BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
