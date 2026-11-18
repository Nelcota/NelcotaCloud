use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};

use crate::support::{
    CreatedTenant, TEST_PASSWORD, TestResult, TestServer, error_code, field, unique_email,
};

async fn admin_request(
    server: &TestServer,
    tenant: &CreatedTenant,
    method: Method,
    path: &str,
) -> TestResult<Response> {
    let response = server
        .client
        .request(method, server.url(path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response)
}

async fn log_in(server: &TestServer, tenant: &CreatedTenant, email: &str) -> TestResult<Response> {
    let body = json!({ "email": email, "password": TEST_PASSWORD.as_str() });

    server
        .post_auth("/auth/v1/login", &tenant.publishable_key, body)
        .await
}

#[tokio::test]
async fn lists_and_searches_users() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let ana = unique_email("ana_100%");
    server.sign_up(&tenant, &ana).await?;
    server.sign_up(&tenant, &unique_email("bruno")).await?;

    let all: Value = admin_request(&server, &tenant, Method::GET, "/auth/v1/admin/users")
        .await?
        .json()
        .await?;
    assert_eq!(field(&all, "/total"), 2);
    let search_path = format!("/auth/v1/admin/users?email={}", "ANA_100%25");
    let found: Value = admin_request(&server, &tenant, Method::GET, &search_path)
        .await?
        .json()
        .await?;
    assert_eq!(field(&found, "/total"), 1);
    assert_eq!(field(&found, "/users/0/email").as_str(), Some(ana.as_str()));

    let too_big = admin_request(
        &server,
        &tenant,
        Method::GET,
        "/auth/v1/admin/users?limit=1000",
    )
    .await?;
    assert_eq!(too_big.status(), StatusCode::BAD_REQUEST);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn a_banned_user_cannot_log_in_or_refresh_until_unbanned() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("banned");
    let session = server.sign_up(&tenant, &email).await?;
    let user_path = format!("/auth/v1/admin/users/{}", session.user.id);

    let ban = admin_request(&server, &tenant, Method::POST, &format!("{user_path}/ban")).await?;
    assert_eq!(ban.status(), StatusCode::OK);

    assert_eq!(
        error_code(log_in(&server, &tenant, &email).await?).await?,
        "user_banned"
    );
    let refresh = server.refresh(&tenant, &session.refresh_token).await?;
    assert_eq!(refresh.status(), StatusCode::UNAUTHORIZED);
    let me = server
        .current_user(&tenant.publishable_key, &session.access_token)
        .await?;
    assert_eq!(me.status(), StatusCode::FORBIDDEN);

    let unban = admin_request(
        &server,
        &tenant,
        Method::POST,
        &format!("{user_path}/unban"),
    )
    .await?;
    assert_eq!(unban.status(), StatusCode::OK);
    assert_eq!(
        log_in(&server, &tenant, &email).await?.status(),
        StatusCode::OK
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn admin_logout_ends_every_session() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("logout-all")).await?;
    let path = format!("/auth/v1/admin/users/{}/logout", session.user.id);

    let logout = admin_request(&server, &tenant, Method::POST, &path).await?;

    assert_eq!(logout.status(), StatusCode::NO_CONTENT);
    let refresh = server.refresh(&tenant, &session.refresh_token).await?;
    assert_eq!(refresh.status(), StatusCode::UNAUTHORIZED);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn admins_delete_users() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("deleted");
    let session = server.sign_up(&tenant, &email).await?;
    let path = format!("/auth/v1/admin/users/{}", session.user.id);

    let deleted = admin_request(&server, &tenant, Method::DELETE, &path).await?;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);

    let lookup = admin_request(&server, &tenant, Method::GET, &path).await?;
    assert_eq!(lookup.status(), StatusCode::NOT_FOUND);
    assert_eq!(
        log_in(&server, &tenant, &email).await?.status(),
        StatusCode::UNAUTHORIZED
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn users_delete_their_own_account() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server
        .sign_up(&tenant, &unique_email("self-delete"))
        .await?;

    let deleted = server
        .client
        .delete(server.url("/auth/v1/user"))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&session.access_token)
        .send()
        .await?;

    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
    let me = server
        .current_user(&tenant.publishable_key, &session.access_token)
        .await?;
    assert_eq!(me.status(), StatusCode::UNAUTHORIZED);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn platform_admins_delete_tenants() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    server.sign_up(&tenant, &unique_email("doomed")).await?;
    let path = format!("/admin/v1/tenants/{}", tenant.tenant_id);

    let deleted = server
        .client
        .delete(server.url(&path))
        .header("x-admin-token", server.admin_token())
        .send()
        .await?;

    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
    let body = json!({ "email": unique_email("after"), "password": TEST_PASSWORD.as_str() });
    let signup = server
        .post_auth("/auth/v1/signup", &tenant.publishable_key, body)
        .await?;
    assert_eq!(signup.status(), StatusCode::UNAUTHORIZED);
    assert!(server.tenant_database_exists(&tenant.slug).await? == false);
    Ok(())
}

/// A session created while a ban was being applied must not outlive it.
#[tokio::test]
async fn banned_users_cannot_refresh_even_a_racing_session() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("racing-ban")).await?;

    server
        .ban_without_ending_sessions(&tenant, session.user.id)
        .await?;

    let refresh = server.refresh(&tenant, &session.refresh_token).await?;
    assert_eq!(refresh.status(), StatusCode::UNAUTHORIZED);
    server.drop_tenant(&tenant).await
}
