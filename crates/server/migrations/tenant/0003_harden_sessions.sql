-- Refresh tokens issued to a family started before this moment are rejected when used, which
-- also catches successors inserted by a refresh racing with the invalidation.
ALTER TABLE users ADD COLUMN sessions_invalidated_at TIMESTAMPTZ;

-- When the session (family) began; copied on every rotation.
ALTER TABLE refresh_tokens ADD COLUMN family_started_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- A revoked family stays revoked even for tokens inserted after the revocation.
CREATE TABLE revoked_token_families (
    family_id UUID PRIMARY KEY,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The app's PKCE challenge, set only on OAuth login codes.
ALTER TABLE one_time_tokens ADD COLUMN code_challenge TEXT;
