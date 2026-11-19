SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

CREATE INDEX IF NOT EXISTS webhook_deliveries_failures_by_time_idx
    ON webhook_deliveries (failed_at)
    WHERE failed_at IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index
        WHERE indexrelid = 'webhook_deliveries_failures_by_time_idx'::regclass
          AND indisvalid
    ) THEN
        RAISE EXCEPTION 'webhook_deliveries_failures_by_time_idx must be valid';
    END IF;
END $$;
