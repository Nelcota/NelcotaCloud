-- Data API traffic per project and hour, for the console's metrics: written every few seconds
-- from each instance's in-memory counters and kept for 35 days.
CREATE TABLE data_api_usage (
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    hour_start TIMESTAMPTZ NOT NULL,
    -- `todos`, `rpc/search`, or empty for names that matched nothing.
    resource TEXT NOT NULL CHECK (char_length(resource) <= 80),
    method TEXT NOT NULL CHECK (char_length(method) <= 10),
    status SMALLINT NOT NULL CHECK (status BETWEEN 100 AND 599),
    requests BIGINT NOT NULL CHECK (requests >= 0),
    duration_milliseconds BIGINT NOT NULL CHECK (duration_milliseconds >= 0),
    PRIMARY KEY (tenant_id, hour_start, resource, method, status)
);

-- Pruning deletes by age across projects.
CREATE INDEX data_api_usage_hour_idx ON data_api_usage (hour_start);
