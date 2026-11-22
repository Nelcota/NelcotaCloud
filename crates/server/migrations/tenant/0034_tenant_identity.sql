CREATE TABLE auth.tenant_identity (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    tenant_id uuid NOT NULL
);

-- Connection pools use this marker before handing a connection to a request or worker.
GRANT SELECT ON auth.tenant_identity TO PUBLIC;
