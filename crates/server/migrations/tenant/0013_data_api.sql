-- The project's own tables go in `public`, served by the Data API. The platform's tables move
-- to `auth`, which the Data API roles can never read.
DO $move$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA auth', table_name);
    END LOOP;
END
$move$;

-- Who may connect is set by the platform with the project's own login role
-- (`tenant_role_statements`), not here: database privileges are not part of a dump.

-- Anyone may look up the schema's objects; its tables and functions keep their own privileges.
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
GRANT USAGE ON SCHEMA auth TO PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA auth FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- What row level security policies call: the claims of the request's access token.
CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ SELECT nullif(auth.jwt() ->> 'sub', '')::uuid $$;

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$ SELECT coalesce(auth.jwt() ->> 'role', 'anon') $$;

GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role()
    TO nelcota_anon, nelcota_authenticated, nelcota_service, nelcota_developer;

-- Bumped by every DDL statement: the Data API reloads its cached view of the schema when the
-- number it reads with each request changes.
CREATE TABLE auth.schema_version (
    singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
    version BIGINT NOT NULL
);
INSERT INTO auth.schema_version (singleton, version) VALUES (true, 1);

-- Readable by every role (a counter reveals nothing), so it does not matter which role a
-- request has switched to when it reads it.
CREATE FUNCTION auth.current_schema_version() RETURNS bigint
    LANGUAGE sql STABLE
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $$ SELECT version FROM auth.schema_version $$;
GRANT EXECUTE ON FUNCTION auth.current_schema_version() TO PUBLIC;

-- Secure by default, for anything created in `public` (console, SQL editor, migrations):
-- - a table starts with row level security on, so it is closed until a policy opens it;
-- - a view runs with the privileges and policies of whoever queries it (security_invoker),
--   so it never exposes rows of the tables under it;
-- - a materialized view cannot have policies, so request roles lose access to it.
CREATE FUNCTION auth.on_ddl_command_end() RETURNS event_trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $$
DECLARE
    command record;
BEGIN
    FOR command IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
        IF command.schema_name = 'public'
            AND command.object_type = 'table'
            AND command.command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO') THEN
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', command.object_identity);
        END IF;

        IF command.schema_name = 'public' AND command.object_type = 'view'
            AND command.command_tag = 'CREATE VIEW' THEN
            EXECUTE format('ALTER VIEW %s SET (security_invoker = true)', command.object_identity);
        END IF;

        IF command.schema_name = 'public' AND command.object_type = 'materialized view'
            AND command.command_tag = 'CREATE MATERIALIZED VIEW' THEN
            EXECUTE format(
                'REVOKE ALL ON %s FROM nelcota_anon, nelcota_authenticated',
                command.object_identity
            );
        END IF;
    END LOOP;

    UPDATE auth.schema_version SET version = version + 1;
END
$$;
REVOKE EXECUTE ON FUNCTION auth.on_ddl_command_end() FROM PUBLIC;

CREATE EVENT TRIGGER nelcota_ddl_command_end ON ddl_command_end
    EXECUTE FUNCTION auth.on_ddl_command_end();

-- `public` belongs to the developer role: tables it creates are reachable by the request
-- roles, and row level security decides which rows.
ALTER SCHEMA public OWNER TO nelcota_developer;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO nelcota_anon, nelcota_authenticated, nelcota_service;

ALTER DEFAULT PRIVILEGES FOR ROLE nelcota_developer IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
    TO nelcota_anon, nelcota_authenticated, nelcota_service;
ALTER DEFAULT PRIVILEGES FOR ROLE nelcota_developer IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES
    TO nelcota_anon, nelcota_authenticated, nelcota_service;
ALTER DEFAULT PRIVILEGES FOR ROLE nelcota_developer IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS
    TO nelcota_anon, nelcota_authenticated, nelcota_service;
