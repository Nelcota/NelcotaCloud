CREATE TABLE pending_magic_links (
    token_hash BYTEA PRIMARY KEY,
    email TEXT NOT NULL,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX pending_magic_links_email_idx ON pending_magic_links (email);
CREATE INDEX pending_magic_links_user_idx ON pending_magic_links (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX pending_magic_links_expiry_idx ON pending_magic_links (expires_at, token_hash);
CREATE INDEX one_time_tokens_expiry_idx ON one_time_tokens (expires_at, id);
CREATE INDEX mfa_challenges_expiry_idx ON mfa_challenges (expires_at, token_hash);
CREATE INDEX refresh_tokens_expiry_idx ON refresh_tokens (expires_at, id);
CREATE INDEX revoked_token_families_revoked_at_idx ON revoked_token_families (revoked_at, family_id);
