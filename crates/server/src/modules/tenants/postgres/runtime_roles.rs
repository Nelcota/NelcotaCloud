use sqlx::postgres::PgConnectOptions;
use sqlx::{Connection, PgConnection, PgPool};

pub const CONTROL_RUNTIME_ROLE: &str = "nelcota_control_runtime";
pub const TENANT_RUNTIME_ROLE: &str = "nelcota_tenant_runtime";

const ROLE_SETUP: &str = "
SELECT pg_advisory_xact_lock(7120000005);
DO $roles$
DECLARE
    credential text := current_setting('nelcota.runtime_credential');
    login_role text;
BEGIN
    FOREACH login_role IN ARRAY ARRAY['nelcota_control_runtime', 'nelcota_tenant_runtime'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = login_role) THEN
            EXECUTE format('CREATE ROLE %I LOGIN', login_role);
        END IF;
        EXECUTE format(
            'ALTER ROLE %I WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
            login_role, credential
        );
    END LOOP;
END
$roles$;
ALTER ROLE nelcota_control_runtime CONNECTION LIMIT 40;
ALTER ROLE nelcota_tenant_runtime CONNECTION LIMIT 160;
GRANT pg_use_reserved_connections TO nelcota_control_runtime;
";

const CONTROL_GRANTS: &str = "
DO $connect$
BEGIN
    EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO nelcota_control_runtime', current_database());
END
$connect$;
GRANT USAGE ON SCHEMA public TO nelcota_control_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nelcota_control_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nelcota_control_runtime;
REVOKE ALL ON TABLE public._sqlx_migrations FROM nelcota_control_runtime;
";

const TENANT_GRANTS: &str = "
GRANT USAGE ON SCHEMA auth TO nelcota_tenant_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO nelcota_tenant_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO nelcota_tenant_runtime;
REVOKE ALL ON TABLE auth._sqlx_migrations, auth.schema_version FROM nelcota_tenant_runtime;
REVOKE INSERT, UPDATE, DELETE ON auth.tenant_identity FROM nelcota_tenant_runtime;
GRANT EXECUTE ON FUNCTION auth.terminate_project_backend(integer, timestamptz) TO nelcota_tenant_runtime;
";

pub async fn configure_runtime_roles(
    options: PgConnectOptions,
    password: &str,
) -> Result<(), sqlx::Error> {
    let mut connection = PgConnection::connect_with(&options.database("postgres")).await?;
    let mut transaction = connection.begin().await?;
    sqlx::query("SELECT set_config('nelcota.runtime_credential', $1, true)")
        .bind(password)
        .execute(&mut *transaction)
        .await?;
    sqlx::raw_sql(ROLE_SETUP).execute(&mut *transaction).await?;
    transaction.commit().await?;
    connection.close().await
}

pub async fn grant_control_runtime(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::raw_sql(CONTROL_GRANTS).execute(pool).await?;

    Ok(())
}

pub async fn grant_tenant_runtime(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::raw_sql(TENANT_GRANTS).execute(pool).await?;

    Ok(())
}
