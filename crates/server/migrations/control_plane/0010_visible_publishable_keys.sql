-- Publishable keys ship inside client apps, so they are public: keeping them lets the console show
-- them again. Secret keys stay hash-only. Keys created before this column stay without one.
ALTER TABLE tenant_api_keys ADD COLUMN publishable_key TEXT;

ALTER TABLE tenant_api_keys ADD CONSTRAINT tenant_api_keys_only_publishable_visible
    CHECK (kind = 'publishable' OR publishable_key IS NULL);
