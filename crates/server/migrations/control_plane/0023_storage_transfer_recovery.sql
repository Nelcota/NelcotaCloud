ALTER TABLE storage_objects ADD COLUMN request_id uuid;

CREATE UNIQUE INDEX storage_upload_requests
    ON storage_objects (tenant_id, bucket_id, owner_id, request_id) NULLS NOT DISTINCT
    WHERE request_id IS NOT NULL;

CREATE INDEX storage_objects_by_owner
    ON storage_objects (tenant_id, owner_id) WHERE owner_id IS NOT NULL;

CREATE TABLE storage_owner_deletions (
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    owner_id uuid NOT NULL,
    next_attempt_at timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, owner_id)
);

CREATE INDEX storage_owner_deletions_due ON storage_owner_deletions (next_attempt_at);

-- Check existing owners once so files left by previously deleted accounts are cleaned up.
INSERT INTO storage_owner_deletions (tenant_id, owner_id, next_attempt_at)
SELECT DISTINCT tenant_id, owner_id, statement_timestamp() + interval '90 seconds'
FROM storage_objects WHERE owner_id IS NOT NULL;
