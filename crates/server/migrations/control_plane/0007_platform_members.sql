-- Platform accounts (users of the platform tenant, who log into the console) and the tenants
-- (projects) they manage. Owners can also delete the project.
CREATE TABLE tenant_members (
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, account_id)
);

CREATE INDEX tenant_members_account_id_idx ON tenant_members (account_id);
