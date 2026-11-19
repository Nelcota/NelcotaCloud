use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};

use crate::support::{
    CreatedTenant, Session, TEST_PASSWORD, TestResult, TestServer, field, unique_email,
};

async fn as_user(
    server: &TestServer,
    tenant: &CreatedTenant,
    session: &Session,
    request: (Method, &str),
) -> TestResult<Response> {
    let (method, path) = request;
    let response = server
        .client
        .request(method, server.url(path))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&session.access_token)
        .send()
        .await?;

    Ok(response)
}

async fn second_device(
    server: &TestServer,
    tenant: &CreatedTenant,
    email: &str,
) -> TestResult<Session> {
    let body = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
    let response = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, body)
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

#[tokio::test]
async fn lists_sessions_and_marks_the_current_one() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("devices");
    let laptop = server.sign_up(&tenant, &email).await?;
    second_device(&server, &tenant, &email).await?;

    let sessions: Vec<Value> = as_user(
        &server,
        &tenant,
        &laptop,
        (Method::GET, "/auth/v1/sessions"),
    )
    .await?
    .json()
    .await?;

    assert_eq!(sessions.len(), 2);
    assert_eq!(
        sessions
            .iter()
            .filter(|session| field(session, "/is_current") == true)
            .count(),
        1
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn logging_out_other_devices_keeps_this_one() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("others");
    let laptop = server.sign_up(&tenant, &email).await?;
    let phone = second_device(&server, &tenant, &email).await?;

    let ended = as_user(
        &server,
        &tenant,
        &laptop,
        (Method::DELETE, "/auth/v1/sessions"),
    )
    .await?;

    assert_eq!(ended.status(), StatusCode::NO_CONTENT);
    let phone_refresh = server.refresh(&tenant, &phone.refresh_token).await?;
    assert_eq!(phone_refresh.status(), StatusCode::UNAUTHORIZED);
    let laptop_refresh = server.refresh(&tenant, &laptop.refresh_token).await?;
    assert_eq!(laptop_refresh.status(), StatusCode::OK);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn ends_one_session_by_id() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("one-device");
    let laptop = server.sign_up(&tenant, &email).await?;
    let phone = second_device(&server, &tenant, &email).await?;
    let sessions: Vec<Value> = as_user(
        &server,
        &tenant,
        &laptop,
        (Method::GET, "/auth/v1/sessions"),
    )
    .await?
    .json()
    .await?;
    let phone_session = sessions
        .iter()
        .find(|session| field(session, "/is_current") == false);
    let phone_id = phone_session
        .and_then(|session| field(session, "/id").as_str())
        .unwrap_or_default();

    let path = format!("/auth/v1/sessions/{phone_id}");
    let ended = as_user(&server, &tenant, &laptop, (Method::DELETE, &path)).await?;

    assert_eq!(ended.status(), StatusCode::NO_CONTENT);
    let phone_refresh = server.refresh(&tenant, &phone.refresh_token).await?;
    assert_eq!(phone_refresh.status(), StatusCode::UNAUTHORIZED);
    let unknown = as_user(
        &server,
        &tenant,
        &laptop,
        (
            Method::DELETE,
            "/auth/v1/sessions/00000000-0000-0000-0000-000000000000",
        ),
    )
    .await?;
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);
    server.drop_tenant(&tenant).await
}
