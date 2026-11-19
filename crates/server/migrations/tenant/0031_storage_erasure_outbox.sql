CREATE TABLE storage_erasure_outbox (
    user_id uuid PRIMARY KEY,
    enqueued_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION enqueue_storage_user_erasure() RETURNS trigger
LANGUAGE plpgsql SET search_path = auth, pg_temp AS $$
BEGIN
    INSERT INTO storage_erasure_outbox (user_id) VALUES (OLD.id) ON CONFLICT DO NOTHING;
    RETURN OLD;
END
$$;

CREATE TRIGGER storage_user_erasure
AFTER DELETE ON users FOR EACH ROW
EXECUTE FUNCTION enqueue_storage_user_erasure();
