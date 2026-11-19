SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

CREATE INDEX IF NOT EXISTS audit_events_failure_period_idx
    ON auth.audit_events (occurred_at, ip_address)
    WHERE action = 'login_failed' AND ip_address IS NOT NULL;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index
        WHERE indexrelid = 'auth.audit_events_failure_period_idx'::regclass AND indisvalid
    ) THEN
        RAISE EXCEPTION 'audit_events_failure_period_idx must be valid';
    END IF;
END
$migration$;
