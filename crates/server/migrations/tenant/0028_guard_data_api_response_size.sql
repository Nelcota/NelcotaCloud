CREATE FUNCTION auth.check_json_response_size(actual_bytes bigint, max_bytes integer)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path = pg_catalog
AS $guard$
BEGIN
    IF actual_bytes > max_bytes THEN
        RAISE EXCEPTION USING ERRCODE = 'NC413', MESSAGE = 'response exceeds its JSON byte budget';
    END IF;
    RETURN true;
END
$guard$;

REVOKE EXECUTE ON FUNCTION auth.check_json_response_size(bigint, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.check_json_response_size(bigint, integer)
    TO nelcota_anon, nelcota_authenticated, nelcota_service, nelcota_developer;
