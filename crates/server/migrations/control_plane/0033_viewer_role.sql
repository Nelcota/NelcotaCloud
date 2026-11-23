-- Viewers read a project in the console (settings, users, logs, rows) but change nothing.
-- Owners make a member a viewer; invitations still join as members.
ALTER TABLE tenant_members DROP CONSTRAINT tenant_members_role_check;
ALTER TABLE tenant_members
    ADD CONSTRAINT tenant_members_role_check CHECK (role IN ('owner', 'member', 'viewer'));
