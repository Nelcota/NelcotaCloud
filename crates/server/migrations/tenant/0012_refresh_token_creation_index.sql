-- Active users are counted from the refresh tokens a month created (each login and refresh
-- writes one), so the count reads only that month's rows.
CREATE INDEX refresh_tokens_created_at_idx ON refresh_tokens (created_at);
