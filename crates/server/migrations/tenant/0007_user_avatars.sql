-- One profile photo per user, already re-encoded by the server as a small square JPEG.
-- Kept apart from `users` so reading users never loads image bytes.
CREATE TABLE user_avatars (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    image BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
