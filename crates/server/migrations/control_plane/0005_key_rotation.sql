-- Last characters of each API key, so owners can tell keys apart; the full key is never stored.
ALTER TABLE tenant_api_keys ADD COLUMN key_hint TEXT;

CREATE INDEX tenant_api_keys_tenant_kind_idx ON tenant_api_keys (tenant_id, kind) WHERE revoked_at IS NULL;

-- When a signing key stopped signing. It keeps verifying for a while, then it is deleted.
ALTER TABLE tenant_signing_keys ADD COLUMN deactivated_at TIMESTAMPTZ;
