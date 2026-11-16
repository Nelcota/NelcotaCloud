use reqwest::{Response, StatusCode};
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TestResult, TestServer, error_code, field, unique_email};

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

async fn revoke(server: &TestServer, secret_key: &str, key_id: &str) -> TestResult<Response> {
    let path = format!("/auth/v1/admin/api-keys/{key_id}");
    let response = server
        .client
        .delete(server.url(&path))
        .header("apikey", secret_key)
        .send()
        .await?;

    Ok(response)
}

async fn create_key(server: &TestServer, secret_key: &str, kind: &str) -> TestResult<Value> {
    let response = server
        .post_auth(
            "/auth/v1/admin/api-keys",
            secret_key,
            json!({ "kind": kind }),
        )
        .await?;
    assert_eq!(response.status(), StatusCode::CREATED);

    Ok(response.json().await?)
}

/// The id of the active key of `kind` other than `except_id`, from the key list.
async fn active_key_id(
    server: &TestServer,
    tenant: &CreatedTenant,
    kind: &str,
    except_id: &str,
) -> TestResult<String> {
    let keys: Vec<Value> = admin_get(server, tenant, "/auth/v1/admin/api-keys")
        .await?
        .json()
        .await?;
    let found = keys.iter().find(|key| {
        field(key, "/kind") == kind
            && field(key, "/revoked_at").is_null()
            && field(key, "/id") != except_id
    });
    let Some(id) = found.and_then(|key| field(key, "/id").as_str()) else {
        return Err(format!("no active {kind} key").into());
    };

    Ok(id.to_owned())
}

#[tokio::test]
async fn publishable_keys_rotate_without_downtime() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let new_key = create_key(&server, &tenant.secret_key, "publishable").await?;
    let new_key_id = field(&new_key, "/id").as_str().unwrap_or_default();
    let new_publishable = field(&new_key, "/key").as_str().unwrap_or_default();
    assert!(new_publishable.ends_with(field(&new_key, "/hint").as_str().unwrap_or("missing")));
    let old_key_id = active_key_id(&server, &tenant, "publishable", new_key_id).await?;

    let revoked = revoke(&server, &tenant.secret_key, &old_key_id).await?;
    assert_eq!(revoked.status(), StatusCode::NO_CONTENT);

    let body = json!({ "email": unique_email("rotated"), "password": "correct horse battery" });
    let with_old = server
        .post_auth("/auth/v1/signup", &tenant.publishable_key, body.clone())
        .await?;
    assert_eq!(with_old.status(), StatusCode::UNAUTHORIZED);
    let with_new = server
        .post_auth("/auth/v1/signup", new_publishable, body)
        .await?;
    assert_eq!(with_new.status(), StatusCode::CREATED);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn the_last_secret_key_cannot_be_revoked() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let only_secret_id = active_key_id(&server, &tenant, "secret", "").await?;

    let refused = revoke(&server, &tenant.secret_key, &only_secret_id).await?;
    assert_eq!(refused.status(), StatusCode::CONFLICT);

    let replacement = create_key(&server, &tenant.secret_key, "secret").await?;
    let replacement_key = field(&replacement, "/key").as_str().unwrap_or_default();
    let revoked = revoke(&server, replacement_key, &only_secret_id).await?;
    assert_eq!(revoked.status(), StatusCode::NO_CONTENT);

    let again = revoke(&server, replacement_key, &only_secret_id).await?;
    assert_eq!(error_code(again).await?, "not_found");
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn publishable_keys_cannot_manage_keys() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let response = server
        .post_auth(
            "/auth/v1/admin/api-keys",
            &tenant.publishable_key,
            json!({ "kind": "secret" }),
        )
        .await?;

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn tokens_of_a_rotated_signing_key_keep_verifying() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let before = server
        .sign_up(&tenant, &unique_email("before-rotation"))
        .await?;

    let rotation = server
        .post_auth(
            "/auth/v1/admin/signing-keys/rotate",
            &tenant.secret_key,
            json!({}),
        )
        .await?;
    assert_eq!(rotation.status(), StatusCode::OK);
    let rotated: Value = rotation.json().await?;

    let old_token = server
        .current_user(&tenant.publishable_key, &before.access_token)
        .await?;
    assert_eq!(old_token.status(), StatusCode::OK);
    let after = server
        .sign_up(&tenant, &unique_email("after-rotation"))
        .await?;
    let header = jsonwebtoken::decode_header(&after.access_token)?;
    assert_eq!(header.kid.as_deref(), field(&rotated, "/key_id").as_str());
    let jwks: Value = admin_get(&server, &tenant, "/auth/v1/jwks")
        .await?
        .json()
        .await?;
    assert_eq!(field(&jwks, "/keys").as_array().map(Vec::len), Some(2));

    server.drop_tenant(&tenant).await
}
