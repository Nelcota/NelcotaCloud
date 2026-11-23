-- Every authenticated request validates its session family. Rotated tokens remain available
-- for replay detection and usage metrics, but do not belong in the active lookup.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX refresh_tokens_active_family_idx
    ON refresh_tokens (family_id, user_id)
    INCLUDE (expires_at, family_started_at)
    WHERE revoked_at IS NULL;
