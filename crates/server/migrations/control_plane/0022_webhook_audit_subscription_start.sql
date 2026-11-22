ALTER TABLE webhook_endpoints ADD COLUMN audit_subscribed_at TIMESTAMPTZ;

-- Creation is the earliest known subscription time for existing active endpoints.
UPDATE webhook_endpoints
SET audit_subscribed_at = created_at
WHERE is_enabled AND 'audit.event' = ANY(event_types);

CREATE FUNCTION track_webhook_audit_subscription() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog
    AS $track$
BEGIN
    IF NEW.is_enabled AND 'audit.event' = ANY(NEW.event_types) THEN
        IF TG_OP = 'INSERT' THEN
            NEW.audit_subscribed_at := clock_timestamp();
        ELSE
            NEW.audit_subscribed_at := COALESCE(OLD.audit_subscribed_at, clock_timestamp());
        END IF;
    ELSE
        NEW.audit_subscribed_at := NULL;
    END IF;

    RETURN NEW;
END
$track$;

CREATE TRIGGER track_webhook_audit_subscription
    BEFORE INSERT OR UPDATE OF is_enabled, event_types ON webhook_endpoints
    FOR EACH ROW EXECUTE FUNCTION track_webhook_audit_subscription();
