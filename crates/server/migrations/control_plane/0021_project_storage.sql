CREATE TABLE storage_buckets (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    name text NOT NULL,
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, name)
);

CREATE TABLE storage_objects (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    bucket_id uuid NOT NULL,
    owner_id uuid,
    name text NOT NULL,
    content_type text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    upload_expires_at timestamptz NOT NULL,
    is_ready boolean NOT NULL DEFAULT false,
    FOREIGN KEY (tenant_id, bucket_id) REFERENCES storage_buckets (tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX storage_object_pages ON storage_objects (tenant_id, bucket_id, id);
CREATE INDEX storage_pending_uploads ON storage_objects (upload_expires_at) WHERE NOT is_ready;

CREATE TABLE storage_object_deletions (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    bucket_id uuid NOT NULL,
    size_bytes bigint NOT NULL,
    next_attempt_at timestamptz NOT NULL
);

CREATE INDEX storage_deletions_due ON storage_object_deletions (next_attempt_at);
CREATE INDEX storage_deletions_by_tenant ON storage_object_deletions (tenant_id);

CREATE FUNCTION enqueue_storage_object_deletion() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    INSERT INTO storage_object_deletions (id, tenant_id, bucket_id, size_bytes, next_attempt_at)
    VALUES (
        OLD.id, OLD.tenant_id, OLD.bucket_id, OLD.size_bytes,
        GREATEST(now(), OLD.upload_expires_at + interval '1 hour')
    );
    RETURN OLD;
END
$$;

CREATE TRIGGER storage_object_deletion
AFTER DELETE ON storage_objects FOR EACH ROW
EXECUTE FUNCTION enqueue_storage_object_deletion();
