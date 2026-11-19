ALTER TABLE storage_buckets ADD COLUMN location text;
ALTER TABLE storage_objects
    ADD COLUMN location text,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN confirm_until timestamptz;

UPDATE storage_objects
SET created_at = upload_expires_at - interval '5 minutes',
    confirm_until = upload_expires_at + interval '15 minutes';

ALTER TABLE storage_objects ALTER COLUMN confirm_until SET NOT NULL;

DROP INDEX storage_pending_uploads;
CREATE INDEX storage_pending_uploads ON storage_objects (confirm_until) WHERE NOT is_ready;
CREATE INDEX storage_ready_pages_by_owner ON storage_objects (tenant_id, bucket_id, owner_id, created_at DESC, id DESC)
    WHERE is_ready AND owner_id IS NOT NULL;
CREATE INDEX storage_ready_pages ON storage_objects (tenant_id, bucket_id, created_at DESC, id DESC)
    WHERE is_ready;
CREATE INDEX storage_owner_objects ON storage_objects (tenant_id, owner_id) WHERE owner_id IS NOT NULL;

ALTER TABLE storage_object_deletions
    ADD COLUMN location text,
    ADD COLUMN owner_id uuid,
    ADD COLUMN was_ready boolean NOT NULL DEFAULT true,
    ADD COLUMN queued_at timestamptz NOT NULL DEFAULT now();

DROP INDEX storage_deletions_due;
CREATE INDEX storage_deletions_due ON storage_object_deletions (location, next_attempt_at, id);

CREATE TABLE storage_erased_users (
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    erased_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX storage_erased_users_expiry ON storage_erased_users (erased_at);

CREATE OR REPLACE FUNCTION enqueue_storage_object_deletion() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    INSERT INTO storage_object_deletions (
        id, tenant_id, bucket_id, size_bytes, next_attempt_at, location, owner_id, was_ready
    ) VALUES (
        OLD.id, OLD.tenant_id, OLD.bucket_id, OLD.size_bytes,
        GREATEST(now(), OLD.upload_expires_at + interval '1 hour'),
        OLD.location, OLD.owner_id, OLD.is_ready
    );
    RETURN OLD;
END
$$;
