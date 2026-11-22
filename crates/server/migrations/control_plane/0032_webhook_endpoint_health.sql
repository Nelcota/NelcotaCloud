-- A name owners give an endpoint ("Sincronizar CRM"), and its delivery health: when its
-- current run of failed attempts started, when the owners were told, and whether the platform
-- paused it after failing for days.
ALTER TABLE webhook_endpoints
    ADD COLUMN description TEXT CHECK (char_length(description) BETWEEN 1 AND 80),
    ADD COLUMN failing_since TIMESTAMPTZ,
    ADD COLUMN failure_alerted_at TIMESTAMPTZ,
    ADD COLUMN auto_paused_at TIMESTAMPTZ;

-- The alert sweep only looks at endpoints that are failing right now.
CREATE INDEX webhook_endpoints_failing_idx ON webhook_endpoints (failing_since)
    WHERE failing_since IS NOT NULL;
