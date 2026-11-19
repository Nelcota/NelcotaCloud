use serde_json::{Value, json};
use server::modules::tenants::audit::audit_retention::prune_expired_audit;
use server::modules::tenants::postgres::tenant_database_server::TenantDatabaseServer;
use server::modules::tenants::provisioning::tenant_slug::TenantSlug;
use time::format_description::well_known::Rfc3339;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::support::{CreatedTenant, TestResult, TestServer};

#[tokio::test]
async fn reads_exclude_expired_events_without_deleting_them() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut connection = server.tenant_database(&tenant).await?;
    let occurred_at = OffsetDateTime::now_utc() - Duration::days(91);
    let retained_at = occurred_at + Duration::days(2);
    sqlx::query(
        "INSERT INTO auth.audit_events (action, actor, occurred_at)
         VALUES ('logged_in', 'user', $1), ('logged_in', 'user', $2)",
    )
    .bind(occurred_at)
    .bind(retained_at)
    .execute(&mut connection)
    .await?;
    let period = (
        occurred_at - Duration::hours(1),
        occurred_at + Duration::hours(1),
    );
    let summary = read_fixed_summary(&server, &tenant, period).await?;
    assert_eq!(summary.get("logins"), Some(&json!(0)));
    let crossing_retention = (
        occurred_at - Duration::hours(1),
        retained_at + Duration::hours(1),
    );
    let summary = read_fixed_summary(&server, &tenant, crossing_retention).await?;
    assert_eq!(summary.get("logins"), Some(&json!(1)));
    let list: Value = server
        .client
        .get(server.url("/auth/v1/admin/audit-events"))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(
        list.get("events").and_then(Value::as_array).map(Vec::len),
        Some(1)
    );
    let expired_exists = "SELECT EXISTS (SELECT 1 FROM auth.audit_events WHERE occurred_at = $1)";
    let exists: bool = sqlx::query_scalar(expired_exists)
        .bind(occurred_at)
        .fetch_one(&mut connection)
        .await?;
    assert!(exists);
    let slug = TenantSlug::parse(&tenant.slug)?;
    let database = TenantDatabaseServer::new(server.tenant_database_base_url());
    let pool = sqlx::PgPool::connect_with(database.auth_options(&slug)?).await?;
    prune_expired_audit(&pool).await?;
    pool.close().await;

    let exists: bool = sqlx::query_scalar(expired_exists)
        .bind(occurred_at)
        .fetch_one(&mut connection)
        .await?;
    assert!(exists == false);
    drop(connection);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn counts_exact_events_and_distinct_accounts_in_a_fixed_interval() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let start = OffsetDateTime::now_utc()
        .date()
        .with_hms(0, 0, 0)?
        .assume_utc()
        - Duration::days(7);
    let end = start + Duration::days(1);
    let mut connection = server.tenant_database(&tenant).await?;
    sqlx::query(
        "INSERT INTO auth.audit_events (action, actor, user_id, email, ip_address, occurred_at)
         VALUES
            ('logged_in', 'user', $1, NULL, NULL, $3::timestamptz + interval '0 hours'),
            ('logged_in', 'user', $1, NULL, NULL, $3::timestamptz + interval '1 hours'),
            ('logged_in', 'user', NULL, NULL, NULL, $3::timestamptz + interval '2 hours'),
            ('logged_in', 'user', $2, NULL, NULL, $3::timestamptz - interval '1 second'),
            ('logged_in', 'user', $2, NULL, NULL, $3::timestamptz + interval '1 day'),
            ('login_failed', 'user', NULL, 'one@example.com', '192.0.2.1', $3::timestamptz + interval '3 hours'),
            ('login_failed', 'user', NULL, 'one@example.com', '192.0.2.1', $3::timestamptz + interval '4 hours'),
            ('login_failed', 'user', NULL, NULL, '192.0.2.1', $3::timestamptz + interval '5 hours'),
            ('login_failed', 'user', $2, 'two@example.com', '192.0.2.2', $3::timestamptz + interval '6 hours'),
            ('login_failed', 'user', NULL, 'one@example.com', NULL, $3::timestamptz + interval '7 hours'),
            ('login_failed', 'user', NULL, 'three@example.com', '192.0.2.1', $3::timestamptz + interval '1 day'),
            ('user_updated', 'user', $1, NULL, NULL, $3::timestamptz + interval '8 hours'),
            ('signed_up', 'user', $2, NULL, NULL, $3::timestamptz + interval '9 hours')",
    )
    .bind(Uuid::new_v4())
    .bind(Uuid::new_v4())
    .bind(start)
    .execute(&mut connection)
    .await?;
    drop(connection);

    let after_insert = read_fixed_summary(&server, &tenant, (start, end)).await?;
    assert_eq!(
        after_insert,
        json!({
            "logins": 3, "active_users": 1, "failures": 5, "changes": 1,
            "failing_addresses": [
                { "ip_address": "192.0.2.1", "failures": 3, "accounts": 1, "last_seen_at": (start + Duration::hours(5)).format(&Rfc3339)? },
                { "ip_address": "192.0.2.2", "failures": 1, "accounts": 1, "last_seen_at": (start + Duration::hours(6)).format(&Rfc3339)? }
            ]
        })
    );

    let mut connection = server.tenant_database(&tenant).await?;
    sqlx::raw_sql("VACUUM (ANALYZE) auth.audit_events")
        .execute(&mut connection)
        .await?;
    drop(connection);
    let after_vacuum = read_fixed_summary(&server, &tenant, (start, end)).await?;
    assert_eq!(after_vacuum, after_insert);

    server.drop_tenant(&tenant).await
}

async fn read_fixed_summary(
    server: &TestServer,
    tenant: &CreatedTenant,
    (start, end): (OffsetDateTime, OffsetDateTime),
) -> TestResult<Value> {
    let response = server
        .client
        .get(server.url("/auth/v1/admin/audit-events/summary"))
        .header("apikey", &tenant.secret_key)
        .query(&[
            ("from", start.format(&Rfc3339)?),
            ("to", end.format(&Rfc3339)?),
        ])
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}
