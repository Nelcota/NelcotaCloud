CREATE TABLE project_audit_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    action text NOT NULL,
    actor text NOT NULL,
    actor_account_id uuid,
    ip_address text NOT NULL,
    user_agent text,
    request_id text,
    details jsonb NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    next_attempt_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_audit_queue_due ON project_audit_queue (next_attempt_at, id);
CREATE INDEX project_audit_queue_tenant ON project_audit_queue (tenant_id);
