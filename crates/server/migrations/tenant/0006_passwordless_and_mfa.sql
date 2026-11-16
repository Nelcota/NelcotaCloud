-- Magic login links are one-time tokens too.
ALTER TABLE one_time_tokens DROP CONSTRAINT one_time_tokens_purpose_check;
ALTER TABLE one_time_tokens ADD CONSTRAINT one_time_tokens_purpose_check
    CHECK (purpose IN ('email_verification', 'password_reset', 'oauth_login', 'magic_link'));

-- One TOTP authenticator per user. The secret is encrypted with the master key; the last
-- accepted time step makes every code usable once (RFC 6238, section 5.2).
CREATE TABLE mfa_factors (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    secret_ciphertext BYTEA NOT NULL,
    verified_at TIMESTAMPTZ,
    last_used_step BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The second step of a login when MFA is on: proves the first factor passed, briefly, and
-- allows only a few wrong codes.
CREATE TABLE mfa_challenges (
    token_hash BYTEA PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

CREATE INDEX mfa_challenges_user_id_idx ON mfa_challenges (user_id);
