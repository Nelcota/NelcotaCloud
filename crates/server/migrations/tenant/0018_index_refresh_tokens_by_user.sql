SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id);

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index
        WHERE indexrelid = 'auth.refresh_tokens_user_id_idx'::regclass AND indisvalid
    ) THEN
        RAISE EXCEPTION 'refresh_tokens_user_id_idx must be valid';
    END IF;
END
$migration$;
