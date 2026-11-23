ALTER TABLE tenant_invitations
    ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (delivery_status IN ('unknown', 'sending', 'sent', 'failed')),
    ADD COLUMN delivery_attempt UUID,
    ADD COLUMN delivery_started_at TIMESTAMPTZ,
    ADD CONSTRAINT invitation_delivery_has_attempt
        CHECK ((delivery_status = 'sending') =
            (delivery_attempt IS NOT NULL AND delivery_started_at IS NOT NULL));
