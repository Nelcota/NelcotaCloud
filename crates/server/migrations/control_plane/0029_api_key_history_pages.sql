CREATE INDEX tenant_api_keys_revoked_page
    ON tenant_api_keys (tenant_id, created_at DESC, id DESC)
    WHERE revoked_at IS NOT NULL;
