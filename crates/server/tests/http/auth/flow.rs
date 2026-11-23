use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::support::{Session, TEST_PASSWORD, TestResult, TestServer, error_code};

#[derive(Deserialize)]
struct JwkSet {
    keys: Vec<Value>,
}

#[tokio::test]
async fn signs_up_reads_user_and_logs_in() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let session = server.sign_up(&tenant, "  Ana@Example.com ").await?;
    assert_eq!(session.user.email, "ana@example.com");
    assert_eq!(session.token_type, "bearer");
    assert!(session.expires_in > 0);

    let user_response = server
        .current_user(&tenant.publishable_key, &session.access_token)
        .await?;
    assert_eq!(user_response.status(), StatusCode::OK);
    let user: crate::support::SessionUser = user_response.json().await?;
    assert_eq!(user.id, session.user.id);

    let login_body = json!({ "email": "ana@example.com", "password": TEST_PASSWORD.as_str() });
    let login = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, login_body)
        .await?;
    assert_eq!(login.status(), StatusCode::OK);
    let login_session: Session = login.json().await?;
    assert_eq!(login_session.user.id, session.user.id);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rotates_refresh_tokens_and_revokes_family_on_reuse() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let first = server.sign_up(&tenant, "rotation@example.com").await?;

    let rotated_response = server.refresh(&tenant, &first.refresh_token).await?;
    assert_eq!(rotated_response.status(), StatusCode::OK);
    let rotated: Session = rotated_response.json().await?;
    assert_ne!(rotated.refresh_token, first.refresh_token);

    let reused = server.refresh(&tenant, &first.refresh_token).await?;
    assert_eq!(reused.status(), StatusCode::UNAUTHORIZED);

    // Reuse revoked the whole family, including the token issued by the legitimate rotation.
    let after_reuse = server.refresh(&tenant, &rotated.refresh_token).await?;
    assert_eq!(after_reuse.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(error_code(after_reuse).await?, "invalid_refresh_token");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn logout_revokes_the_session() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, "logout@example.com").await?;
    let body = json!({ "refresh_token": session.refresh_token });

    let logout = server
        .post_auth("/auth/v1/logout", &tenant.publishable_key, body)
        .await?;
    assert_eq!(logout.status(), StatusCode::NO_CONTENT);

    let refresh = server.refresh(&tenant, &session.refresh_token).await?;
    assert_eq!(refresh.status(), StatusCode::UNAUTHORIZED);

    let access = server
        .current_user(&tenant.publishable_key, &session.access_token)
        .await?;
    assert_eq!(access.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn the_data_api_requires_an_active_session() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, "data-session@example.com").await?;
    let mut database = server.tenant_database(&tenant).await?;
    sqlx::raw_sql(
        "CREATE TABLE public.session_fixture (id integer PRIMARY KEY);
         GRANT SELECT ON public.session_fixture TO nelcota_authenticated;",
    )
    .execute(&mut database)
    .await?;
    let rows = || {
        server
            .client
            .get(server.url("/rest/v1/session_fixture"))
            .header("apikey", &tenant.publishable_key)
            .bearer_auth(&session.access_token)
    };

    assert_eq!(rows().send().await?.status(), StatusCode::OK);
    let body = json!({ "refresh_token": session.refresh_token });
    let logout = server
        .post_auth("/auth/v1/logout", &tenant.publishable_key, body)
        .await?;
    assert_eq!(logout.status(), StatusCode::NO_CONTENT);
    assert_eq!(rows().send().await?.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn an_unavailable_refresh_insert_leaves_the_session_renewable() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, "retry-refresh@example.com").await?;
    let mut database = server.tenant_database(&tenant).await?;
    sqlx::query("ALTER TABLE refresh_tokens ADD CONSTRAINT test_refresh_insert CHECK (revoked_at IS NOT NULL) NOT VALID")
        .execute(&mut database)
        .await?;

    let unavailable = server.refresh(&tenant, &session.refresh_token).await?;
    assert_eq!(unavailable.status(), StatusCode::INTERNAL_SERVER_ERROR);
    sqlx::query("ALTER TABLE refresh_tokens DROP CONSTRAINT test_refresh_insert")
        .execute(&mut database)
        .await?;

    let retry = server.refresh(&tenant, &session.refresh_token).await?;
    assert_eq!(retry.status(), StatusCode::OK);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn publishes_jwks_with_the_signing_key_id() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let response = server
        .client
        .get(server.url("/auth/v1/jwks"))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    let jwks: JwkSet = response.json().await?;

    assert_eq!(jwks.keys.len(), 1);
    let key = jwks.keys.first().ok_or("JWKS is empty")?;
    assert_eq!(key.get("kty"), Some(&json!("OKP")));
    assert_eq!(key.get("crv"), Some(&json!("Ed25519")));
    assert!(
        key.get("d").is_none(),
        "private key material must never be published"
    );
    assert!(key.get("kid").is_some());

    server.drop_tenant(&tenant).await
}
