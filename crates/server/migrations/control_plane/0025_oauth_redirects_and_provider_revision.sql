ALTER TABLE tenants ADD COLUMN oauth_redirect_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE tenant_oauth_providers ADD COLUMN revision UUID NOT NULL DEFAULT gen_random_uuid();

-- Pending states cannot be attributed to a particular revision of the old configuration.
DELETE FROM oauth_authorization_states;
ALTER TABLE oauth_authorization_states ADD COLUMN provider_revision UUID NOT NULL;
