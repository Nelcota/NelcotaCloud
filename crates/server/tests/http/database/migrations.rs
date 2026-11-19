use reqwest::{Response, StatusCode};
use serde_json::{Value, json};

use super::support::{Credentials, rest_json};
use crate::support::{CreatedTenant, TestResult, TestServer, error_code, field};

const PATH: &str = "/database/v1/migrations";
const CREATE: &str =
    "CREATE TABLE migrated_items (id INTEGER); INSERT INTO migrated_items VALUES (1);";

async fn apply(
    server: &TestServer,
    tenant: &CreatedTenant,
    migration: Value,
) -> TestResult<Response> {
    let response = server
        .client
        .post(server.url(PATH))
        .header("apikey", &tenant.secret_key)
        .json(&migration)
        .send()
        .await?;

    Ok(response)
}

async fn history(server: &TestServer, tenant: &CreatedTenant) -> TestResult<Value> {
    let response = server
        .client
        .get(server.url(PATH))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

fn migration(version: i64, name: &str, sql: &str) -> Value {
    json!({ "version": version, "name": name, "sql": sql })
}

#[tokio::test]
async fn concurrent_replays_apply_a_migration_once_and_share_history() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let script = migration(20_261_118_000_001, "create_items", CREATE);
    let (first, second) = tokio::try_join!(
        apply(&server, &tenant, script.clone()),
        apply(&server, &tenant, script),
    )?;
    let statuses = [first.status(), second.status()];
    assert!(statuses.contains(&StatusCode::CREATED), "{statuses:?}");
    assert!(statuses.contains(&StatusCode::OK), "{statuses:?}");
    let record: Value = first.json().await?;
    let replay: Value = second.json().await?;
    assert_eq!(record, replay);
    assert_eq!(field(&record, "/actor_account_id"), &Value::Null);

    let entries = history(&server, &tenant).await?;
    assert_eq!(field(&entries, "/migrations"), &json!([record]));
    let rows = rest_json(&server, Credentials::service(&tenant), "/migrated_items").await?;
    assert_eq!(rows, json!([{ "id": 1 }]));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_changes_to_applied_versions_and_out_of_order_files() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    apply(&server, &tenant, migration(2, "create_items", CREATE))
        .await?
        .error_for_status()?;

    for changed in [
        migration(2, "renamed", CREATE),
        migration(2, "create_items", &format!("{CREATE}\n")),
    ] {
        let response = apply(&server, &tenant, changed).await?;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        assert_eq!(error_code(response).await?, "migration_mismatch");
    }

    let older = apply(&server, &tenant, migration(1, "older", "SELECT 1")).await?;
    assert_eq!(older.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(older).await?, "migration_out_of_order");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn failed_migrations_roll_back_sql_and_history_and_allow_a_retry() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    for later_statement in [
        "SELECT 1 / 0",
        "COMMIT",
        "ROLLBACK",
        "RESET ROLE",
        "SELECT 1 FROM auth.users",
        "SELECT version FROM nelcota_migrations.applied",
    ] {
        let script = format!("{CREATE}\n{later_statement};");
        let failed = apply(&server, &tenant, migration(1, "create_items", &script)).await?;
        assert_eq!(
            failed.status(),
            StatusCode::BAD_REQUEST,
            "{later_statement}"
        );
        assert_eq!(error_code(failed).await?, "sql_error");
        let entries = history(&server, &tenant).await?;
        assert_eq!(field(&entries, "/migrations"), &json!([]));
    }

    let fixed = apply(&server, &tenant, migration(1, "create_items", CREATE)).await?;
    assert_eq!(fixed.status(), StatusCode::CREATED);

    server.drop_tenant(&tenant).await
}
