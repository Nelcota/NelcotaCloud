-- A SECURITY DEFINER routine can run as the project owner and bypass RLS.
-- Keep ordinary routines callable by default. Privileged ones need an explicit grant.
CREATE FUNCTION auth.restrict_definer_routine_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $function$
DECLARE
    routine record;
BEGIN
    FOR routine IN
        SELECT DISTINCT p.oid, p.proname
        FROM pg_event_trigger_ddl_commands() AS command
        JOIN pg_proc AS p ON command.classid = 'pg_proc'::regclass AND p.oid = command.objid
        WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
    LOOP
        EXECUTE format(
            'REVOKE EXECUTE ON ROUTINE public.%I(%s) FROM PUBLIC, nelcota_anon, nelcota_authenticated',
            routine.proname, pg_get_function_identity_arguments(routine.oid)
        );
    END LOOP;
END
$function$;

REVOKE EXECUTE ON FUNCTION auth.restrict_definer_routine_access() FROM PUBLIC;

CREATE EVENT TRIGGER nelcota_restrict_definer_routine_access ON ddl_command_end
    WHEN TAG IN ('CREATE FUNCTION', 'ALTER FUNCTION', 'CREATE PROCEDURE', 'ALTER PROCEDURE', 'ALTER ROUTINE')
    EXECUTE FUNCTION auth.restrict_definer_routine_access();

-- Existing direct grants cannot be distinguished from the inherited defaults.
DO $migration$
DECLARE
    routine record;
BEGIN
    FOR routine IN
        SELECT oid, proname FROM pg_catalog.pg_proc
        WHERE pronamespace = 'public'::regnamespace AND prosecdef
    LOOP
        EXECUTE pg_catalog.format(
            'REVOKE EXECUTE ON ROUTINE public.%I(%s) FROM PUBLIC, nelcota_anon, nelcota_authenticated',
            routine.proname, pg_catalog.pg_get_function_identity_arguments(routine.oid)
        );
    END LOOP;
END
$migration$;
