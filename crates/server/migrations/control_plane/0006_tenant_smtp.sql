-- A tenant's own SMTP server for its auth emails. The URL carries credentials, so it is
-- encrypted; host and port are kept in clear only to show them back to the owner.
CREATE TABLE tenant_smtp_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL,
    smtp_url_ciphertext BYTEA NOT NULL,
    email_from TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
