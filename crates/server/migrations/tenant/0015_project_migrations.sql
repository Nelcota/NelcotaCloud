CREATE SCHEMA nelcota_migrations;
REVOKE ALL ON SCHEMA nelcota_migrations FROM PUBLIC;
GRANT USAGE ON SCHEMA nelcota_migrations TO nelcota_migrator;

CREATE TABLE nelcota_migrations.applied (
    version BIGINT PRIMARY KEY CHECK (version BETWEEN 1 AND 9007199254740991),
    name TEXT NOT NULL,
    checksum BYTEA NOT NULL CHECK (octet_length(checksum) = 32),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    actor_account_id UUID
);
GRANT SELECT, INSERT ON nelcota_migrations.applied TO nelcota_migrator;

-- SPI runs the script inside an atomic function call, so client SQL cannot commit the
-- surrounding transaction. The function owner can change public but cannot reach this
-- private schema, including the ledger and the function's own definition.
CREATE FUNCTION nelcota_migrations.execute_script(script TEXT) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $function$
BEGIN
    EXECUTE script;
END
$function$;
ALTER FUNCTION nelcota_migrations.execute_script(TEXT) OWNER TO nelcota_developer;
REVOKE ALL ON FUNCTION nelcota_migrations.execute_script(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nelcota_migrations.execute_script(TEXT) TO nelcota_migrator;
