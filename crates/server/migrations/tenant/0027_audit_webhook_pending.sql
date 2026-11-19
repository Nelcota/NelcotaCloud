CREATE TABLE audit_webhook_pending (
    event_id BIGINT PRIMARY KEY REFERENCES audit_events (id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX audit_webhook_pending_occurred_at_idx
    ON audit_webhook_pending (occurred_at, event_id);

-- Installing the trigger also waits for audit writers using the previous schema.
CREATE FUNCTION enqueue_audit_webhook() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog, auth
    AS $enqueue$
BEGIN
    INSERT INTO auth.audit_webhook_pending (event_id, occurred_at)
    VALUES (NEW.id, NEW.occurred_at);
    RETURN NEW;
END
$enqueue$;

CREATE TRIGGER enqueue_audit_webhook
    AFTER INSERT ON audit_events
    FOR EACH ROW EXECUTE FUNCTION enqueue_audit_webhook();

INSERT INTO audit_webhook_pending (event_id, occurred_at)
SELECT event.id, event.occurred_at
FROM audit_events event CROSS JOIN audit_webhook_cursor cursor
WHERE event.id > cursor.last_event_id AND event.occurred_at > now() - interval '1 hour';
