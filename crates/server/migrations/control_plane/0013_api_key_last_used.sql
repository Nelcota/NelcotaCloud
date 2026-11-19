-- When each API key was last used, so owners can tell whether revoking it would break an app.
-- Recorded at most once per key every few minutes; keys used only before this column existed
-- stay NULL until their next request.
ALTER TABLE tenant_api_keys ADD COLUMN last_used_at TIMESTAMPTZ;
