ALTER TABLE tenant_smtp_settings
    ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
