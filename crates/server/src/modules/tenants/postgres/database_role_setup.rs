use sqlx::AssertSqlSafe;

use crate::modules::tenants::postgres::database_roles::{
    tenant_authenticator_role, tenant_direct_role,
};
use crate::modules::tenants::postgres::tenant_pool_limits::TenantPoolLimits;
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

/// Closes every project database to `PUBLIC`.
///
/// Only its own roles (and the runtime role) may connect. A direct connection role is a member
/// of the developer role, which owns `public` in every project database, so a database left open
/// to `PUBLIC` would let another project's direct connection walk in as its developer.
pub const CLOSE_TENANT_DATABASES: &str = r"
SELECT pg_advisory_xact_lock(7120000011);
DO $close$
DECLARE
    database_name text;
BEGIN
    FOR database_name IN
        SELECT datname FROM pg_database
        WHERE datname LIKE 'tenant\_%' AND has_database_privilege('public', datname, 'CONNECT')
    LOOP
        EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', database_name);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelcota_tenant_runtime') THEN
            EXECUTE format('GRANT CONNECT ON DATABASE %I TO nelcota_tenant_runtime', database_name);
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_roles
            WHERE rolname = 'nelcota_t_' || substring(database_name FROM 8)
        ) THEN
            EXECUTE format(
                'GRANT CONNECT ON DATABASE %I TO %I',
                database_name,
                'nelcota_t_' || substring(database_name FROM 8)
            );
        END IF;
    END LOOP;
END
$close$;
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
    let connection_limit = TenantPoolLimits::DATA_API.connections_per_tenant;

    AssertSqlSafe(format!(
        "
SELECT pg_advisory_xact_lock(7120000003);
SELECT pg_advisory_xact_lock(7120000011);
DO $role$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
        CREATE ROLE \"{role}\" LOGIN NOINHERIT;
    END IF;
END
$role$;
ALTER ROLE \"{role}\" WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
    NOBYPASSRLS CONNECTION LIMIT {connection_limit} PASSWORD '{password}';
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

/// Connections one project may hold directly, so its ORMs cannot take the whole server.
const DIRECT_CONNECTION_LIMIT: u16 = 10;

/// Creates the project's direct connection role, or gives it a new password.
///
/// The old password stops working for new connections. `slug` is `[a-z0-9_]` and `password`
/// lowercase hex, so neither can break out of the identifiers and literal.
pub fn direct_role_statements(slug: &TenantSlug, password: &str) -> AssertSqlSafe<String> {
    let role = tenant_direct_role(slug);
    let database = slug.database_name();

    AssertSqlSafe(format!(
        "
SELECT pg_advisory_xact_lock(7120000007);
{CLOSE_TENANT_DATABASES}
DO $role$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
        CREATE ROLE \"{role}\" LOGIN NOINHERIT;
    END IF;
END
$role$;
ALTER ROLE \"{role}\" WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
    NOBYPASSRLS CONNECTION LIMIT {DIRECT_CONNECTION_LIMIT} PASSWORD '{password}';
ALTER ROLE \"{role}\" RESET ALL;
GRANT nelcota_developer TO \"{role}\" WITH INHERIT FALSE, SET TRUE;
ALTER ROLE \"{role}\" SET role = 'nelcota_developer';
ALTER ROLE \"{role}\" SET search_path = public;
ALTER ROLE \"{role}\" SET statement_timeout = '60s';
ALTER ROLE \"{role}\" SET idle_in_transaction_session_timeout = '60s';
GRANT CONNECT ON DATABASE \"{database}\" TO \"{role}\";
"
    ))
}

/// Whether the project's direct connection role exists (a password was ever set).
pub const DIRECT_ROLE_EXISTS: &str = "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1)";

/// Drops a project's authenticator and direct connection role once its database is gone.
pub fn drop_tenant_role_statement(slug: &TenantSlug) -> AssertSqlSafe<String> {
    let role = tenant_authenticator_role(slug);
    let direct_role = tenant_direct_role(slug);

    AssertSqlSafe(format!(
        "DROP ROLE IF EXISTS \"{role}\"; DROP ROLE IF EXISTS \"{direct_role}\""
    ))
}
