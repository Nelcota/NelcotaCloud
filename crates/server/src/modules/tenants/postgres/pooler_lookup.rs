use sqlx::postgres::PgConnectOptions;
use sqlx::{Connection, PgConnection};

/// The connection pooler (`PgBouncer`) logs in as this role only to look up the password hash of
/// a project's direct connection role; it has no other privilege.
pub const POOLER_LOOKUP_ROLE: &str = "nelcota_pgbouncer";

/// Runs in the `postgres` database (the pooler's `auth_dbname`). The lookup function only
/// answers for direct connection roles (`nelcota_c_*`), so the pooler can never authenticate
/// the server's administrator, the runtime roles or a project's Data API role.
const POOLER_LOOKUP_SETUP: &str = r"
SELECT pg_advisory_xact_lock(7120000009);
DO $role$
DECLARE
    credential text := current_setting('nelcota.pooler_credential');
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelcota_pgbouncer') THEN
        CREATE ROLE nelcota_pgbouncer LOGIN;
    END IF;
    EXECUTE format(
        'ALTER ROLE nelcota_pgbouncer WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 10 PASSWORD %L',
        credential
    );
END
$role$;
CREATE SCHEMA IF NOT EXISTS pgbouncer;
REVOKE ALL ON SCHEMA pgbouncer FROM PUBLIC;
GRANT USAGE ON SCHEMA pgbouncer TO nelcota_pgbouncer;
CREATE OR REPLACE FUNCTION pgbouncer.user_lookup(username text, OUT uname text, OUT phash text)
    RETURNS record
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = pg_catalog
AS $lookup$
    SELECT usename::text, passwd::text
    FROM pg_catalog.pg_shadow
    WHERE usename = username AND usename LIKE 'nelcota\_c\_%'
$lookup$;
REVOKE ALL ON FUNCTION pgbouncer.user_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pgbouncer.user_lookup(text) TO nelcota_pgbouncer;
";

/// Creates or repairs the pooler's lookup role and function with the configured password.
pub async fn configure_pooler_lookup(
    options: PgConnectOptions,
    password: &str,
) -> Result<(), sqlx::Error> {
    let mut connection = PgConnection::connect_with(&options).await?;
    let mut transaction = connection.begin().await?;
    sqlx::query("SELECT set_config('nelcota.pooler_credential', $1, true)")
        .bind(password)
        .execute(&mut *transaction)
        .await?;
    sqlx::raw_sql(POOLER_LOOKUP_SETUP)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;
    connection.close().await
}
