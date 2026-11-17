-- Transactional outbox: an event is written in the same transaction as the change it
-- describes, so no event is lost and none is sent for a change that rolled back.
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX webhook_events_created_at_idx ON webhook_events (created_at);

-- One delivery per event and endpoint; endpoints live in the control plane.
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES webhook_events (id) ON DELETE CASCADE,
    endpoint_id UUID NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_attempt_at TIMESTAMPTZ,
    last_response_status INTEGER,
    last_error TEXT,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The worker claims only pending deliveries, so this index stays as small as the queue.
CREATE INDEX webhook_deliveries_pending_idx ON webhook_deliveries (next_attempt_at)
    WHERE delivered_at IS NULL AND failed_at IS NULL;

CREATE INDEX webhook_deliveries_endpoint_idx ON webhook_deliveries (endpoint_id, created_at DESC);
