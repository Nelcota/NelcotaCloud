use reqwest::{Method, StatusCode};
use serde_json::{Value, json};

use crate::support::{TEST_SITE_URL, TestResult, TestServer, field, random_slug, unique_email};

const PATH: &str = "/database/v1/migrations";

#[tokio::test]
async fn lists_only_the_projects_history_and_validates_the_cursor() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let other = server.create_tenant().await?;
    let mut connection = server.tenant_database(&tenant).await?;
    sqlx::query(
        "INSERT INTO nelcota_migrations.applied (version, name, checksum)
         SELECT version, 'seed', sha256('seed'::bytea) FROM generate_series(1, 52) AS version",
    )
    .execute(&mut connection)
    .await?;
    drop(connection);

    let list = |key: &str, suffix: &str| {
        server
            .client
            .get(server.url(&format!("{PATH}{suffix}")))
            .header("apikey", key)
    };
    let first: Value = list(&tenant.secret_key, "")
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&first, "/migrations/0/version"), 52);
    assert_eq!(field(&first, "/migrations/49/version"), 3);
    assert_eq!(field(&first, "/next_before"), 3);
    let second: Value = list(&tenant.secret_key, "?before=3")
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&second, "/migrations/0/version"), 2);
    assert_eq!(field(&second, "/migrations/1/version"), 1);
    assert_eq!(field(&second, "/next_before"), &Value::Null);
    let unrelated: Value = list(&other.secret_key, "")
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&unrelated, "/migrations"), &json!([]));

    assert_eq!(
        list(&tenant.secret_key, "?before=0").send().await?.status(),
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        list(&tenant.publishable_key, "").send().await?.status(),
        StatusCode::FORBIDDEN
    );
    let refused = server
        .client
        .post(server.url(PATH))
        .header("apikey", &tenant.publishable_key)
        .json(&json!({ "version": 53, "name": "restricted", "sql": "SELECT 1" }))
        .send()
        .await?;
    assert_eq!(refused.status(), StatusCode::FORBIDDEN);

    server.drop_tenant(&other).await?;
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn logs_the_verified_console_account_and_refuses_non_members() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("migration-owner"))
        .await?;
    let stranger = server
        .sign_up_console_account(&platform, &unique_email("migration-stranger"))
        .await?;
    let project: Value = server
        .client
        .post(server.url("/platform/v1/projects"))
        .bearer_auth(&owner.access_token)
        .json(&json!({ "slug": random_slug(), "name": "Migrations", "site_url": TEST_SITE_URL }))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let project_id = field(&project, "/tenant_id")
        .as_str()
        .ok_or("missing project ID")?;
    let request = |method: Method, token: &str| {
        server
            .client
            .request(method, server.url(PATH))
            .bearer_auth(token)
            .header("x-nelcota-project", project_id)
    };

    let body =
        json!({ "version": 1, "name": "init", "sql": "CREATE TABLE initialized (id INTEGER)" });
    let refused = request(Method::POST, &stranger.access_token)
        .json(&body)
        .send()
        .await?;
    assert_eq!(refused.status(), StatusCode::FORBIDDEN);
    let forbidden = request(Method::GET, &stranger.access_token).send().await?;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);
    let applied = request(Method::POST, &owner.access_token)
        .json(&body)
        .send()
        .await?;
    assert_eq!(applied.status(), StatusCode::CREATED);
    let entry: Value = applied.json().await?;
    assert_eq!(field(&entry, "/actor_account_id"), &json!(owner.user.id));

    let entries: Value = request(Method::GET, &owner.access_token)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&entries, "/migrations"), &json!([entry]));
    server
        .client
        .delete(server.url(&format!("/platform/v1/projects/{project_id}")))
        .bearer_auth(&owner.access_token)
        .send()
        .await?
        .error_for_status()?;
    server.drop_tenant(&platform).await
}
