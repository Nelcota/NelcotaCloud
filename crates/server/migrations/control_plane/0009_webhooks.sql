-- Where a tenant's webhook events go. The signing secret is encrypted; after a rotation the
-- previous one keeps signing for a day, so receivers can switch without dropping events.
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    event_types TEXT[] NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    secret_ciphertext BYTEA NOT NULL,
    previous_secret_ciphertext BYTEA,
    previous_secret_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX webhook_endpoints_tenant_id_idx ON webhook_endpoints (tenant_id);

-- Which tenants have webhook deliveries due, and from when. The delivery worker reads only
-- this table, so it opens a tenant database only when there is work in it.
CREATE TABLE webhook_schedule (
    tenant_id UUID PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
    next_due_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX webhook_schedule_next_due_at_idx ON webhook_schedule (next_due_at);
