-- A project's own wording for each auth email, in plain text. `{app_name}` in any field is
-- replaced by the project's name; the HTML layout and the link stay the platform's.
CREATE TABLE tenant_email_templates (
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('verification', 'password_reset', 'magic_link')),
    subject TEXT NOT NULL,
    heading TEXT NOT NULL,
    message TEXT NOT NULL,
    action_label TEXT NOT NULL,
    note TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, kind)
);
