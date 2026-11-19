use server::shared::database::migrators::TENANT_MIGRATOR;
use sqlx::{AssertSqlSafe, Connection, PgConnection};

use crate::support::{CreatedTenant, TestResult, TestServer, unique_email};

/// The last migration of databases created before the `auth` schema: their Auth tables and
/// migration history live in `public`.
const LEGACY_SCHEMA_VERSION: i64 = 9;

/// Replaces the tenant's database with one left at the legacy layout.
async fn rebuild_as_legacy(server: &TestServer, tenant: &CreatedTenant) -> TestResult {
    let base_url = server.tenant_database_base_url();
    let mut maintenance = PgConnection::connect(&format!("{base_url}/postgres")).await?;
    // The slug comes from `random_slug`: `t_` plus hex characters.
    let database = format!("\"tenant_{}\"", tenant.slug);
    let drop = format!("DROP DATABASE {database} WITH (FORCE)");
    sqlx::raw_sql(AssertSqlSafe(drop))
        .execute(&mut maintenance)
        .await?;
    let create = format!("CREATE DATABASE {database}");
    sqlx::raw_sql(AssertSqlSafe(create))
        .execute(&mut maintenance)
        .await?;
    maintenance.close().await?;

    let mut legacy = PgConnection::connect(&format!("{base_url}/tenant_{}", tenant.slug)).await?;
    TENANT_MIGRATOR
        .run_to(LEGACY_SCHEMA_VERSION, &mut legacy)
        .await?;
    legacy.close().await?;

    Ok(())
}

#[tokio::test]
async fn databases_with_auth_tables_in_public_are_upgraded_on_first_use() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    rebuild_as_legacy(&server, &tenant).await?;

    server.sign_up(&tenant, &unique_email("legacy")).await?;

    let mut database = server.tenant_database(&tenant).await?;
    let latest_version = TENANT_MIGRATOR
        .iter()
        .map(|migration| migration.version)
        .max();
    let applied_version: Option<i64> =
        sqlx::query_scalar("SELECT max(version) FROM auth._sqlx_migrations")
            .fetch_one(&mut database)
            .await?;
    assert_eq!(applied_version, latest_version);
    let users: i64 = sqlx::query_scalar("SELECT count(*) FROM auth.users")
        .fetch_one(&mut database)
        .await?;
    assert_eq!(users, 1);
    database.close().await?;

    server.drop_tenant(&tenant).await
}
