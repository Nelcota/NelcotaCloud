CREATE TABLE webhook_worker_heartbeats (
    replica_id UUID PRIMARY KEY,
    last_seen_at TIMESTAMPTZ NOT NULL,
    last_poll_at TIMESTAMPTZ,
    last_batch_at TIMESTAMPTZ
);

CREATE INDEX webhook_worker_heartbeats_last_seen_idx
    ON webhook_worker_heartbeats (last_seen_at);
