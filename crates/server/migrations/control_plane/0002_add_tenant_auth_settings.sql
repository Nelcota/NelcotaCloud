-- Base URL of the tenant's app: email links point here and OAuth redirects must stay on its origin.
ALTER TABLE tenants ADD COLUMN site_url TEXT;

CREATE TABLE tenant_oauth_providers (
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'github')),
    client_id TEXT NOT NULL,
    client_secret_ciphertext BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, provider)
);

-- Pending OAuth authorizations. The callback does not know the tenant, so state lives here.
CREATE TABLE oauth_authorization_states (
    state_hash BYTEA PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    pkce_verifier_ciphertext BYTEA NOT NULL,
    redirect_to TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
