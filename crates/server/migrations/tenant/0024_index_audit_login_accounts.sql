SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

CREATE INDEX IF NOT EXISTS audit_events_login_user_time_idx
    ON auth.audit_events (user_id, occurred_at)
    WHERE action = 'logged_in' AND user_id IS NOT NULL;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index
        WHERE indexrelid = 'auth.audit_events_login_user_time_idx'::regclass AND indisvalid
    ) THEN
        RAISE EXCEPTION 'audit_events_login_user_time_idx must be valid';
    END IF;
END
$migration$;
