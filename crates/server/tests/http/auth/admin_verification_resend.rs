use reqwest::{Response, StatusCode};
use serde_json::json;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::support::{CreatedTenant, TestResult, TestServer, error_code, unique_email};

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

async fn resend_verification(
    server: &TestServer,
    tenant: &CreatedTenant,
    user_id: Uuid,
) -> TestResult<Response> {
    let path = format!("/auth/v1/admin/users/{user_id}/verification-email");

    admin_post(server, tenant, &path).await
}

async fn mark_verified(database: &mut PgConnection, user_id: Uuid) -> TestResult {
    sqlx::query("UPDATE users SET email_verified_at = now() WHERE id = $1")
        .bind(user_id)
        .execute(database)
        .await?;

    Ok(())
}

#[tokio::test]
async fn admins_resend_the_verification_email_within_the_limit() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("resend")).await?;
    let user_id = session.user.id;
    let mut database = server.tenant_database(&tenant).await?;

    let resent = resend_verification(&server, &tenant, user_id).await?;
    assert_eq!(resent.status(), StatusCode::ACCEPTED);
    let links: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM one_time_tokens WHERE user_id = $1 AND purpose = 'email_verification'",
    )
    .bind(user_id)
    .fetch_one(&mut database)
    .await?;
    assert_eq!(links, 2);

    let mut last_status = StatusCode::ACCEPTED;
    for _ in 0..3 {
        last_status = resend_verification(&server, &tenant, user_id)
            .await?
            .status();
    }
    assert_eq!(last_status, StatusCode::TOO_MANY_REQUESTS);

    let missing = resend_verification(&server, &tenant, Uuid::new_v4()).await?;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn verified_or_banned_users_get_no_new_verification_email() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let verified = server.sign_up(&tenant, &unique_email("verified")).await?;
    let banned = server.sign_up(&tenant, &unique_email("banned")).await?;
    let mut database = server.tenant_database(&tenant).await?;
    mark_verified(&mut database, verified.user.id).await?;
    server
        .ban_without_ending_sessions(&tenant, banned.user.id)
        .await?;

    let already_verified = resend_verification(&server, &tenant, verified.user.id).await?;
    assert_eq!(already_verified.status(), StatusCode::CONFLICT);
    assert_eq!(
        error_code(already_verified).await?,
        "email_already_verified"
    );
    let banned_user = resend_verification(&server, &tenant, banned.user.id).await?;
    assert_eq!(banned_user.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(banned_user).await?, "user_banned");
    server.drop_tenant(&tenant).await
}
#[tokio::test]
async fn verification_email_quota_is_shared_between_replicas() -> TestResult {
    let first = TestServer::start().await?;
    let second = TestServer::start().await?;
    let tenant = first.create_tenant().await?;
    let email = unique_email("shared-email-quota");

    for server in [&first, &second, &first] {
        let body = json!({ "email": email });
        let response = server
            .post_auth(
                "/auth/v1/verify-email/resend",
                &tenant.publishable_key,
                body,
            )
            .await?;
        assert_eq!(response.status(), StatusCode::ACCEPTED);
    }

    let body = json!({ "email": email });
    let response = second
        .post_auth(
            "/auth/v1/verify-email/resend",
            &tenant.publishable_key,
            body,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    first.drop_tenant(&tenant).await
}
