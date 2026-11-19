CREATE FUNCTION auth.terminate_project_backend(backend_id integer, started_at timestamptz)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $terminate$
    SELECT COALESCE((
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE pid = backend_id AND backend_start = started_at
          AND datname = current_database()
          AND usename IN ('nelcota_t_' || substring(current_database() FROM 8),
                          session_user)
    ), false)
$terminate$;

REVOKE EXECUTE ON FUNCTION auth.terminate_project_backend(integer, timestamptz) FROM PUBLIC;
