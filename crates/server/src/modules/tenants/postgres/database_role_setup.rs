use sqlx::AssertSqlSafe;

use crate::modules::tenants::postgres::database_roles::tenant_authenticator_role;
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;

/// The request roles exist once per Postgres server (privileges are granted inside each tenant
/// database by its migrations). Several instances may start at once, so creation runs under a
/// lock.
pub const CREATE_SHARED_ROLES: &str = "
SELECT pg_advisory_xact_lock(7120000001);
DO $roles$
DECLARE
    role_name text;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['nelcota_anon', 'nelcota_authenticated', 'nelcota_migrator'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT', role_name);
        END IF;
    END LOOP;

    FOREACH role_name IN ARRAY ARRAY['nelcota_service', 'nelcota_developer'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT BYPASSRLS', role_name);
        END IF;
    END LOOP;
END
$roles$;
";

/// Creates (or repairs) a project's authenticator.
///
/// Login with the derived password, no attributes, no defaults it may have set on itself, members of the request roles, and the
/// only role allowed to connect to the project's database.
///
/// `slug` is `[a-z0-9_]` and `password` lowercase hex, so neither can break out of the
/// identifiers and literal (roles and passwords cannot be bound as parameters).
pub fn tenant_role_statements(slug: &TenantSlug, password: &str) -> AssertSqlSafe<String> {
    let role = tenant_authenticator_role(slug);
    let database = slug.database_name();

    AssertSqlSafe(format!(
        "
SELECT pg_advisory_xact_lock(7120000003);
DO $role$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
        CREATE ROLE \"{role}\" LOGIN NOINHERIT;
    END IF;
END
$role$;
ALTER ROLE \"{role}\" WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
    NOBYPASSRLS CONNECTION LIMIT 5 PASSWORD '{password}';
ALTER ROLE \"{role}\" RESET ALL;
GRANT nelcota_anon, nelcota_authenticated, nelcota_service, nelcota_developer TO \"{role}\";
REVOKE ALL ON DATABASE \"{database}\" FROM PUBLIC;
GRANT CONNECT ON DATABASE \"{database}\" TO \"{role}\";
GRANT TEMPORARY ON DATABASE \"{database}\" TO nelcota_developer;
DO $runtime$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelcota_tenant_runtime') THEN
        GRANT CONNECT ON DATABASE \"{database}\" TO nelcota_tenant_runtime;
        GRANT nelcota_migrator TO nelcota_tenant_runtime WITH INHERIT FALSE, SET TRUE;
    END IF;
END
$runtime$;
"
    ))
}

/// Drops a project's authenticator once its database is gone.
pub fn drop_tenant_role_statement(slug: &TenantSlug) -> AssertSqlSafe<String> {
    let role = tenant_authenticator_role(slug);

    AssertSqlSafe(format!("DROP ROLE IF EXISTS \"{role}\""))
}
