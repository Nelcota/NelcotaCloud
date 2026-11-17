-- Deleting expired events checks, and cascades to, the deliveries of each event.
CREATE INDEX webhook_deliveries_event_id_idx ON webhook_deliveries (event_id);
