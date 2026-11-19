ALTER TABLE webhook_deliveries
    ADD COLUMN lease_token UUID,
    ADD COLUMN lease_expires_at TIMESTAMPTZ,
    ADD CONSTRAINT webhook_delivery_lease_matches_state CHECK (
        (lease_token IS NULL AND lease_expires_at IS NULL)
        OR (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL
            AND delivered_at IS NULL AND failed_at IS NULL)
    );

CREATE INDEX webhook_deliveries_pending_endpoint_idx
    ON webhook_deliveries (endpoint_id, next_attempt_at, id)
    WHERE delivered_at IS NULL AND failed_at IS NULL;

CREATE INDEX webhook_deliveries_leased_endpoint_idx
    ON webhook_deliveries (endpoint_id, lease_expires_at)
    WHERE lease_token IS NOT NULL;
