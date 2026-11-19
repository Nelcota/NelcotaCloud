CREATE TABLE pending_tenant_deletions (
    tenant_id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    requested_by UUID,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pending_tenant_deletions_next_attempt_at
    ON pending_tenant_deletions (next_attempt_at, tenant_id);
