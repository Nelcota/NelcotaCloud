use reqwest::{Response, StatusCode};
use serde_json::Value;
use uuid::Uuid;

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};

async fn admin_get(
    server: &TestServer,
    tenant: &CreatedTenant,
    path: &str,
) -> TestResult<Response> {
    let response = server
        .client
        .get(server.url(path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response)
}

async fn admin_post(
    server: &TestServer,
    tenant: &CreatedTenant,
    path: &str,
) -> TestResult<Response> {
    let response = server
        .client
        .post(server.url(path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response)
}

#[tokio::test]
async fn shows_a_users_sessions_and_last_login() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("sessions")).await?;
    let user_path = format!("/auth/v1/admin/users/{}", session.user.id);
    let path = format!("{user_path}/sessions");

    let sessions: Value = admin_get(&server, &tenant, &path).await?.json().await?;

    assert!(field(&sessions, "/last_sign_in_at").is_string());
    assert_eq!(
        field(&sessions, "/sessions").as_array().map(Vec::len),
        Some(1)
    );
    assert_eq!(field(&sessions, "/sessions/0/is_current"), false);

    let logout = admin_post(&server, &tenant, &format!("{user_path}/logout")).await?;
    assert_eq!(logout.status(), StatusCode::NO_CONTENT);
    let after_logout: Value = admin_get(&server, &tenant, &path).await?.json().await?;
    assert!(field(&after_logout, "/last_sign_in_at").is_string());
    assert_eq!(
        field(&after_logout, "/sessions").as_array().map(Vec::len),
        Some(0)
    );

    let missing = format!("/auth/v1/admin/users/{}/sessions", Uuid::new_v4());
    let not_found = admin_get(&server, &tenant, &missing).await?;
    assert_eq!(not_found.status(), StatusCode::NOT_FOUND);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn lists_a_users_linked_identities() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("identities")).await?;
    let mut database = server.tenant_database(&tenant).await?;
    sqlx::query(
        "INSERT INTO identities (id, user_id, provider, provider_user_id) VALUES ($1, $2, 'github', '42')",
    )
    .bind(Uuid::new_v4())
    .bind(session.user.id)
    .execute(&mut database)
    .await?;
    let path = format!("/auth/v1/admin/users/{}/identities", session.user.id);

    let identities: Value = admin_get(&server, &tenant, &path).await?.json().await?;

    assert_eq!(field(&identities, "/identities/0/provider"), "github");
    assert!(field(&identities, "/identities/0/linked_at").is_string());
    assert!(field(&identities, "/identities/0/provider_user_id").is_null());

    let missing = format!("/auth/v1/admin/users/{}/identities", Uuid::new_v4());
    let not_found = admin_get(&server, &tenant, &missing).await?;
    assert_eq!(not_found.status(), StatusCode::NOT_FOUND);
    server.drop_tenant(&tenant).await
}
