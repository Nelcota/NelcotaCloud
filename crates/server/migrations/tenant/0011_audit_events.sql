-- What happened to the project's users and who did it, for the console's activity log.
-- No foreign key to `users`: the trail outlives the account it describes.
CREATE TABLE audit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action TEXT NOT NULL,
    user_id UUID,
    -- The address typed at a failed login, which may match no user.
    email TEXT,
    actor TEXT NOT NULL CHECK (actor IN ('user', 'secret_key', 'console_account')),
    actor_account_id UUID,
    login_method TEXT,
    ip_address TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((actor = 'console_account') = (actor_account_id IS NOT NULL))
);

CREATE INDEX audit_events_user_id_idx ON audit_events (user_id, id DESC);
CREATE INDEX audit_events_occurred_at_idx ON audit_events (occurred_at);
