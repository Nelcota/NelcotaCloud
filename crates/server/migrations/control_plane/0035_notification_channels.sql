-- Where a project sends its alerts (failing webhooks, refused-login spikes, Data API errors,
-- storage near its limit): email addresses, or Discord and Slack incoming webhooks. Webhook
-- URLs carry their own secret, so they are stored encrypted; `target_hint` is what the console
-- shows instead.
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('email', 'discord', 'slack')),
    -- The email address in clear, or the sealed webhook URL.
    target BYTEA NOT NULL,
    target_hint TEXT NOT NULL CHECK (char_length(target_hint) BETWEEN 1 AND 254),
    events TEXT[] NOT NULL CHECK (
        cardinality(events) BETWEEN 1 AND 4
        AND events <@ ARRAY['webhook_failing', 'login_failures', 'data_api_errors', 'storage_near_limit']
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notification_channels_tenant_idx ON notification_channels (tenant_id, created_at);

-- When each project was last alerted about each event, so one condition that lasts sends one
-- alert every few hours instead of one per sweep.
CREATE TABLE notification_alerts (
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    last_sent_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, event)
);
