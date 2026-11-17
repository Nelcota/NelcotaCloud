use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use reqwest::{Response, StatusCode};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::support::{CreatedTenant, Session, TestResult, TestServer, field, unique_email};

async fn update_own(
    server: &TestServer,
    (tenant, session): (&CreatedTenant, &Session),
    body: Value,
) -> TestResult<Response> {
    let response = server
        .client
        .patch(server.url("/auth/v1/user"))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&session.access_token)
        .json(&body)
        .send()
        .await?;

    Ok(response)
}

async fn admin_update(
    server: &TestServer,
    (tenant, user_id): (&CreatedTenant, Uuid),
    body: Value,
) -> TestResult<Response> {
    let response = server
        .client
        .patch(server.url(&format!("/auth/v1/admin/users/{user_id}")))
        .header("apikey", &tenant.secret_key)
        .json(&body)
        .send()
        .await?;

    Ok(response)
}

fn token_claims(access_token: &str) -> TestResult<Value> {
    let Some(payload) = access_token.split('.').nth(1) else {
        return Err("the access token is not a JWT".into());
    };
    let bytes = URL_SAFE_NO_PAD.decode(payload)?;

    Ok(serde_json::from_slice(&bytes)?)
}

#[tokio::test]
async fn users_replace_their_own_metadata_only() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("metadata")).await?;
    let new_user = server
        .current_user(&tenant.publishable_key, &session.access_token)
        .await?;
    let new_user: Value = new_user.json().await?;
    assert_eq!(field(&new_user, "/user_metadata"), &json!({}));
    assert_eq!(field(&new_user, "/app_metadata"), &json!({}));

    let body = json!({ "user_metadata": { "name": "Ana", "theme": "dark" } });
    let updated = update_own(&server, (&tenant, &session), body).await?;
    assert_eq!(updated.status(), StatusCode::OK);
    let updated: Value = updated.json().await?;
    assert_eq!(field(&updated, "/user_metadata/name"), "Ana");

    let replaced = json!({ "user_metadata": { "name": "Ana Lima" } });
    let replaced: Value = update_own(&server, (&tenant, &session), replaced)
        .await?
        .json()
        .await?;
    assert_eq!(
        field(&replaced, "/user_metadata"),
        &json!({ "name": "Ana Lima" })
    );

    let escalation = json!({ "user_metadata": {}, "app_metadata": { "role": "admin" } });
    let refused = update_own(&server, (&tenant, &session), escalation).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);

    let not_an_object = json!({ "user_metadata": ["a"] });
    let refused = update_own(&server, (&tenant, &session), not_an_object).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);

    let too_large = json!({ "user_metadata": { "text": "a".repeat(17 * 1024) } });
    let refused = update_own(&server, (&tenant, &session), too_large).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn admins_set_app_metadata_sent_in_new_access_tokens() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("claims")).await?;
    let user_id = session.user.id;
    assert_eq!(
        field(&token_claims(&session.access_token)?, "/app_metadata"),
        &json!({})
    );

    let body = json!({ "app_metadata": { "role": "editor", "plan": "pro" } });
    let updated = admin_update(&server, (&tenant, user_id), body).await?;
    assert_eq!(updated.status(), StatusCode::OK);
    let updated: Value = updated.json().await?;
    assert_eq!(field(&updated, "/app_metadata/role"), "editor");
    assert_eq!(field(&updated, "/user_metadata"), &json!({}));

    let refreshed: Session = server
        .refresh(&tenant, &session.refresh_token)
        .await?
        .error_for_status()?
        .json()
        .await?;
    let claims = token_claims(&refreshed.access_token)?;
    assert_eq!(
        field(&claims, "/app_metadata"),
        &json!({ "role": "editor", "plan": "pro" })
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn admin_updates_refuse_bad_requests() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("admin-meta")).await?;
    let user_id = session.user.id;

    let empty = admin_update(&server, (&tenant, user_id), json!({})).await?;
    assert_eq!(empty.status(), StatusCode::BAD_REQUEST);

    let too_large = json!({ "app_metadata": { "text": "a".repeat(5 * 1024) } });
    let refused = admin_update(&server, (&tenant, user_id), too_large).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);

    let body = json!({ "user_metadata": { "name": "Ana" } });
    let missing = admin_update(&server, (&tenant, Uuid::new_v4()), body).await?;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);

    let publishable = server
        .client
        .patch(server.url(&format!("/auth/v1/admin/users/{user_id}")))
        .header("apikey", &tenant.publishable_key)
        .json(&json!({ "app_metadata": { "role": "admin" } }))
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
