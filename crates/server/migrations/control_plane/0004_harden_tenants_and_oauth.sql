-- Tenant database URLs are derived from the slug and the current TENANT_DATABASE_BASE_URL, so a
-- copy (with server credentials) no longer lives in every tenant row.
ALTER TABLE tenants DROP COLUMN database_url_ciphertext;

-- Email links and OAuth redirects need it; a tenant without one could never verify users.
ALTER TABLE tenants ALTER COLUMN site_url SET NOT NULL;

-- Pending authorizations live for minutes; dropping them only restarts in-flight logins.
DELETE FROM oauth_authorization_states;

-- PKCE between the tenant's app and this server: the login code is only redeemable with the
-- verifier held by the app that started the flow.
ALTER TABLE oauth_authorization_states ADD COLUMN app_code_challenge TEXT NOT NULL;

CREATE INDEX oauth_authorization_states_expires_at_idx ON oauth_authorization_states (expires_at);
