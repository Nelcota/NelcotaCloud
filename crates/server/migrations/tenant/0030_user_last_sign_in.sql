-- The last login, kept on the user so the admin list can show and sort by it without reading
-- every refresh token. Every login starts a refresh token family, so a new family's first token
-- is the login; rotations within a family keep its start and change nothing.
ALTER TABLE users ADD COLUMN last_sign_in_at TIMESTAMPTZ;

UPDATE users
SET last_sign_in_at = latest.started_at
FROM (
    SELECT user_id, max(family_started_at) AS started_at
    FROM refresh_tokens
    GROUP BY user_id
) AS latest
WHERE latest.user_id = users.id;

CREATE FUNCTION record_last_sign_in() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog, auth
    AS $record$
BEGIN
    UPDATE auth.users
    SET last_sign_in_at = NEW.family_started_at
    WHERE id = NEW.user_id
      AND (last_sign_in_at IS NULL OR last_sign_in_at < NEW.family_started_at);
    RETURN NULL;
END
$record$;

CREATE TRIGGER record_last_sign_in
    AFTER INSERT ON refresh_tokens
    FOR EACH ROW EXECUTE FUNCTION record_last_sign_in();

-- Most recent login first, then users who never logged in; the id breaks ties for the cursor.
CREATE INDEX users_last_sign_in_idx ON users (last_sign_in_at DESC NULLS LAST, id DESC);
