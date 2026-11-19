SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

-- Keep the summary index out of the failure ranking's index choices.
CREATE INDEX IF NOT EXISTS audit_events_summary_counts_time_idx
    ON auth.audit_events (occurred_at) INCLUDE (action)
    WHERE action IS DISTINCT FROM 'logged_in' OR user_id IS NULL;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index
        WHERE indexrelid = 'auth.audit_events_summary_counts_time_idx'::regclass AND indisvalid
    ) THEN
        RAISE EXCEPTION 'audit_events_summary_counts_time_idx must be valid';
    END IF;
END
$migration$;
