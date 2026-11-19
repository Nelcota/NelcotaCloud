-- IP addresses and ranges refused by the project's public auth routes (login, signup, links).
CREATE TABLE blocked_addresses (
    id UUID PRIMARY KEY,
    network CIDR NOT NULL UNIQUE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- A temporary block lapses on its own; NULL blocks until removed.
    expires_at TIMESTAMPTZ
);

CREATE INDEX blocked_addresses_network_idx ON blocked_addresses USING gist (network inet_ops);
