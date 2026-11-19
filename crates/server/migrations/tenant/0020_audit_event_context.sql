-- Where an event came from and what it changed, for the activity log's detail panel.
-- `details` holds a small JSON object chosen by the server (section, table, key name), never
-- request bodies or secrets.
ALTER TABLE audit_events
    ADD COLUMN user_agent TEXT,
    ADD COLUMN request_id TEXT,
    ADD COLUMN details JSONB;
