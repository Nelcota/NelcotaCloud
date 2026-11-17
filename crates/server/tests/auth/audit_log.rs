use reqwest::StatusCode;
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TEST_PASSWORD, TestResult, TestServer, field, unique_email};

async fn audit_page(server: &TestServer, tenant: &CreatedTenant, query: &str) -> TestResult<Value> {
    let response = server
        .client
        .get(server.url(&format!("/auth/v1/admin/audit-events{query}")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

async fn log_in(
    server: &TestServer,
    tenant: &CreatedTenant,
    password: &str,
) -> TestResult<StatusCode> {
    let body = json!({ "email": tenant_user_email(tenant), "password": password });
    let response = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, body)
        .await?;

    Ok(response.status())
}

fn tenant_user_email(tenant: &CreatedTenant) -> String {
    format!("audit-{}@example.com", tenant.slug)
}

#[tokio::test]
async fn records_logins_and_failed_attempts() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &tenant_user_email(&tenant)).await?;

    assert_eq!(
        log_in(&server, &tenant, "wrong password").await?,
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        log_in(&server, &tenant, TEST_PASSWORD).await?,
        StatusCode::OK
    );

    let page = audit_page(&server, &tenant, "").await?;
    let logged_in = field(&page, "/events/0");
    assert_eq!(field(logged_in, "/action"), "logged_in");
    assert_eq!(field(logged_in, "/actor"), "user");
    assert_eq!(field(logged_in, "/login_method"), "password");
    assert_eq!(field(logged_in, "/user_id"), &json!(session.user.id));
    assert_eq!(field(logged_in, "/ip_address"), "127.0.0.1");
    assert_eq!(
        field(logged_in, "/email"),
        &json!(tenant_user_email(&tenant))
    );
    let failed = field(&page, "/events/1");
    assert_eq!(field(failed, "/action"), "login_failed");
    assert_eq!(field(failed, "/user_id"), &Value::Null);
    assert_eq!(field(failed, "/email"), &json!(tenant_user_email(&tenant)));
    assert_eq!(field(&page, "/next_before"), &Value::Null);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn records_admin_actions_by_user_with_pages() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let banned = server.sign_up(&tenant, &unique_email("audit-ban")).await?;
    let other = server
        .sign_up(&tenant, &unique_email("audit-other"))
        .await?;
    for (user_id, action) in [
        (banned.user.id, "ban"),
        (other.user.id, "ban"),
        (banned.user.id, "unban"),
    ] {
        let path = format!("/auth/v1/admin/users/{user_id}/{action}");
        let response = server
            .client
            .post(server.url(&path))
            .header("apikey", &tenant.secret_key)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::OK);
    }

    let query = format!("?user_id={}&limit=1", banned.user.id);
    let first = audit_page(&server, &tenant, &query).await?;
    assert_eq!(field(&first, "/events").as_array().map(Vec::len), Some(1));
    assert_eq!(field(&first, "/events/0/action"), "user_unbanned");
    assert_eq!(field(&first, "/events/0/actor"), "secret_key");
    assert_eq!(field(&first, "/events/0/actor_account_id"), &Value::Null);
    let Some(next_before) = field(&first, "/next_before").as_i64() else {
        return Err("expected an older page".into());
    };

    let older = format!("{query}&before={next_before}");
    let second = audit_page(&server, &tenant, &older).await?;
    assert_eq!(field(&second, "/events/0/action"), "user_banned");
    assert_eq!(field(&second, "/next_before"), &Value::Null);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_invalid_pages_and_publishable_keys() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let path = "/auth/v1/admin/audit-events";

    for query in ["?limit=0", "?limit=101", "?before=0", "?user_id=not-a-uuid"] {
        let response = server
            .client
            .get(server.url(&format!("{path}{query}")))
            .header("apikey", &tenant.secret_key)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{query}");
    }

    let publishable = server
        .client
        .get(server.url(path))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
