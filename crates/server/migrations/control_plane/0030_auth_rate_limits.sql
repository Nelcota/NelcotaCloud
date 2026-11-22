CREATE TABLE auth_rate_limits (
    bucket BYTEA PRIMARY KEY,
    ready_at_ms BIGINT NOT NULL
);

CREATE INDEX auth_rate_limits_ready_idx ON auth_rate_limits (ready_at_ms);
