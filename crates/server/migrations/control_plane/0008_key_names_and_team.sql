-- A label for each API key ("App iOS", "Servidor de produção"), so owners can tell keys apart
-- beyond their last characters. Keys created before this have an empty name.
ALTER TABLE tenant_api_keys ADD COLUMN name TEXT NOT NULL DEFAULT '';

-- The member's email as of their last console visit, so the team list needs no lookup in the
-- platform tenant's database. Empty until the member's next request refreshes it.
ALTER TABLE tenant_members ADD COLUMN account_email TEXT NOT NULL DEFAULT '';

-- Pending invitations to join a project, accepted by the console account whose verified email
-- matches. One pending invitation per project and email.
CREATE TABLE tenant_invitations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    invited_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX tenant_invitations_email_idx ON tenant_invitations (email);
