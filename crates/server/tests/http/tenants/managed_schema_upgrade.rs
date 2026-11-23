use server::modules::tenants::postgres::authenticator_password::authenticator_password;
use server::modules::tenants::postgres::database_roles::tenant_authenticator_role;
use server::modules::tenants::postgres::runtime_roles::{
    CONTROL_RUNTIME_ROLE, TENANT_RUNTIME_ROLE, grant_tenant_runtime,
};
use server::modules::tenants::postgres::tenant_pool_limits::TenantPoolLimits;
use server::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use server::modules::tenants::provisioning::tenant_slug::TenantSlug;
use server::shared::crypto::hex_encoding::encode_hex;
use server::shared::crypto::opaque_token::hash_opaque_token;
use server::startup::app_state_builder::build_app_state;
use sqlx::{AssertSqlSafe, PgConnection};
use uuid::Uuid;

use crate::support::{TestResult, TestServer};

#[tokio::test]
async fn managed_startup_isolates_a_damaged_project_and_workers_wait_for_schema() -> TestResult {
    let server = TestServer::start().await?;
    let damaged = server.create_tenant().await?;
    let healthy = server.create_tenant().await?;
    let wrong_identity = Uuid::new_v4();
    let mut damaged_database = server.tenant_database(&damaged).await?;
    reset_preparation(&mut damaged_database, wrong_identity).await?;
    let mut healthy_database = server.tenant_database(&healthy).await?;
    reset_preparation(&mut healthy_database, healthy.tenant_id).await?;

    let mut config = server.config();
    let password = "managed-schema-fixture";
    config.database_runtime_password = Some(password.to_owned());
    let (state, _tasks) = build_app_state(&config).await?;
    let role: String = sqlx::query_scalar("SELECT current_user")
        .fetch_one(&state.control_plane_pool)
        .await?;
    assert_eq!(role, CONTROL_RUNTIME_ROLE);

    let slug = TenantSlug::parse(&healthy.slug)?;
    state
        .tenant_pools
        .database_server()
        .ensure_tenant_role(&slug)
        .await?;
    let fixture_pool = server.tenant_fixture_pool(&healthy).await?;
    grant_tenant_runtime(&fixture_pool).await?;
    fixture_pool.close().await;

    let mut worker_url = url::Url::parse(&config.tenant_database_base_url)?;
    worker_url
        .set_username(TENANT_RUNTIME_ROLE)
        .map_err(|()| "Postgres URL does not accept a username")?;
    worker_url
        .set_password(Some(password))
        .map_err(|()| "Postgres URL does not accept a password")?;
    let worker = TenantPoolRegistry::new(state.control_plane_pool.clone(), worker_url.to_string())
        .with_managed_schema();
    let worker_pool = worker.pool_for(healthy.tenant_id).await?;
    assert!(worker_pool.acquire().await.is_err());

    assert!(
        state
            .tenant_pools
            .pool_for(damaged.tenant_id)
            .await
            .is_err()
    );
    assert_eq!(
        preparation(&mut damaged_database).await?,
        (wrong_identity, 0)
    );

    let api_pool = state.tenant_pools.pool_for(healthy.tenant_id).await?;
    let role: String = sqlx::query_scalar("SELECT current_user")
        .fetch_one(&api_pool)
        .await?;
    assert_eq!(role, TENANT_RUNTIME_ROLE);
    let (id, version) = preparation(&mut healthy_database).await?;
    assert_eq!(id, healthy.tenant_id);
    assert!(version > 0);
    assert!(worker_pool.acquire().await.is_ok());
    let data_pool = state
        .tenant_pools
        .data_api_pool_for(healthy.tenant_id)
        .await?;
    assert!(data_pool.acquire().await.is_ok());
    let can_read_fingerprint: bool = sqlx::query_scalar(
        "SELECT has_column_privilege(current_user, 'auth.tenant_identity', 'authenticator_fingerprint', 'SELECT')",
    )
    .fetch_one(&data_pool)
    .await?;
    assert!(can_read_fingerprint == false);
    data_pool.close().await;

    // Simulate the previous release's prepared project and cluster-wide role limit.
    let role_name = tenant_authenticator_role(&slug);
    let old_password = authenticator_password(&config.tenant_database_base_url, &slug)?;
    sqlx::raw_sql(AssertSqlSafe(format!(
        "ALTER ROLE \"{role_name}\" CONNECTION LIMIT 5"
    )))
    .execute(&mut healthy_database)
    .await?;
    sqlx::query("UPDATE auth.tenant_identity SET authenticator_fingerprint = $1 WHERE singleton")
        .bind(encode_hex(&hash_opaque_token(&old_password)))
        .execute(&mut healthy_database)
        .await?;

    let restarted_registry = TenantPoolRegistry::new(
        state.control_plane_pool.clone(),
        config.tenant_database_base_url.clone(),
    )
    .with_runtime_password(password.to_owned());
    let upgraded = restarted_registry
        .data_api_pool_for(healthy.tenant_id)
        .await?;
    let connection_limit: i32 =
        sqlx::query_scalar("SELECT rolconnlimit FROM pg_roles WHERE rolname = current_user")
            .fetch_one(&upgraded)
            .await?;
    assert_eq!(
        connection_limit,
        i32::try_from(TenantPoolLimits::DATA_API.connections_per_tenant)?
    );

    server.drop_tenant(&damaged).await?;
    server.drop_tenant(&healthy).await
}

async fn reset_preparation(database: &mut PgConnection, identity: Uuid) -> TestResult {
    sqlx::query("UPDATE auth.tenant_identity SET tenant_id = $1, prepared_through = 0")
        .bind(identity)
        .execute(database)
        .await?;

    Ok(())
}

async fn preparation(database: &mut PgConnection) -> TestResult<(Uuid, i64)> {
    let marker = sqlx::query_as("SELECT tenant_id, prepared_through FROM auth.tenant_identity")
        .fetch_one(database)
        .await?;

    Ok(marker)
}
