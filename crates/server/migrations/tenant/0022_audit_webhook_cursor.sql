-- The last activity log event handed to webhook endpoints (`audit.event`); a single row.
CREATE TABLE audit_webhook_cursor (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    last_event_id BIGINT NOT NULL
);

-- Starts at the current end of the log: subscribing never replays the past.
INSERT INTO audit_webhook_cursor (last_event_id)
SELECT COALESCE(max(id), 0) FROM audit_events;
