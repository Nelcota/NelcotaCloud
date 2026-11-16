-- A banned user can neither log in nor refresh; their sessions end when the ban is set.
ALTER TABLE users ADD COLUMN banned_at TIMESTAMPTZ;

-- The admin user list pages through users from the newest.
CREATE INDEX users_created_at_idx ON users (created_at DESC, id DESC);
