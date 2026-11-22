CREATE TABLE tenant_provisioning_intents (
    slug text PRIMARY KEY,
    tenant_id uuid NOT NULL UNIQUE,
    recover_after timestamptz NOT NULL DEFAULT (now() + interval '2 minutes')
);

CREATE INDEX tenant_provisioning_intents_due
    ON tenant_provisioning_intents (recover_after, slug);
