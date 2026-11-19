use std::io::Cursor;

use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
use reqwest::{Response, StatusCode};
use serde_json::Value;

use crate::support::{
    CreatedTenant, Session, TestResult, TestServer, error_code, field, unique_email,
};

const MAX_UPLOAD_BYTES: usize = 1024 * 1024;
const STORED_SIZE: u32 = 256;

fn png(width: u32, height: u32) -> TestResult<Vec<u8>> {
    let image = RgbaImage::from_pixel(width, height, Rgba([40, 90, 200, 255]));
    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(image).write_to(&mut bytes, ImageFormat::Png)?;

    Ok(bytes.into_inner())
}

async fn upload(
    server: &TestServer,
    tenant: &CreatedTenant,
    session: &Session,
    image: Vec<u8>,
) -> TestResult<Response> {
    let response = server
        .client
        .put(server.url("/auth/v1/user/avatar"))
        .header("apikey", &tenant.publishable_key)
        .header("content-type", "application/octet-stream")
        .bearer_auth(&session.access_token)
        .body(image)
        .send()
        .await?;

    Ok(response)
}

async fn remove(
    server: &TestServer,
    tenant: &CreatedTenant,
    session: &Session,
) -> TestResult<Response> {
    let response = server
        .client
        .delete(server.url("/auth/v1/user/avatar"))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&session.access_token)
        .send()
        .await?;

    Ok(response)
}

async fn fetch(server: &TestServer, api_key: &str, session: &Session) -> TestResult<Response> {
    let path = format!("/auth/v1/users/{}/avatar", session.user.id);
    let response = server
        .client
        .get(server.url(&path))
        .query(&[("apikey", api_key), ("version", "1")])
        .send()
        .await?;

    Ok(response)
}

async fn signed_up(server: &TestServer, tenant: &CreatedTenant) -> TestResult<Session> {
    server.sign_up(tenant, &unique_email("avatar")).await
}

#[tokio::test]
async fn uploaded_photo_is_served_as_a_small_square_jpeg() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = signed_up(&server, &tenant).await?;

    let uploaded = upload(&server, &tenant, &session, png(900, 400)?).await?;
    assert_eq!(uploaded.status(), StatusCode::OK);
    let user: Value = uploaded.json().await?;
    assert!(field(&user, "/avatar_updated_at").is_string());

    let served = fetch(&server, &tenant.publishable_key, &session).await?;
    assert_eq!(served.status(), StatusCode::OK);
    let headers = served.headers();
    assert_eq!(headers["content-type"], "image/jpeg");
    assert_eq!(headers["cache-control"], "public, max-age=3600");
    assert_eq!(headers["x-content-type-options"], "nosniff");
    let photo = image::load_from_memory(&served.bytes().await?)?;
    assert_eq!((photo.width(), photo.height()), (STORED_SIZE, STORED_SIZE));

    let current: Value = server
        .current_user(&tenant.publishable_key, &session.access_token)
        .await?
        .json()
        .await?;
    assert_eq!(
        field(&current, "/avatar_updated_at"),
        field(&user, "/avatar_updated_at")
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn removing_the_photo_stops_serving_it() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = signed_up(&server, &tenant).await?;
    upload(&server, &tenant, &session, png(64, 64)?)
        .await?
        .error_for_status()?;

    let removed = remove(&server, &tenant, &session).await?;
    assert_eq!(removed.status(), StatusCode::NO_CONTENT);
    let removed_again = remove(&server, &tenant, &session).await?;
    assert_eq!(removed_again.status(), StatusCode::NO_CONTENT);

    let served = fetch(&server, &tenant.publishable_key, &session).await?;
    assert_eq!(served.status(), StatusCode::NOT_FOUND);
    let current: Value = server
        .current_user(&tenant.publishable_key, &session.access_token)
        .await?
        .json()
        .await?;
    assert!(field(&current, "/avatar_updated_at").is_null());
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_files_that_are_not_images() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = signed_up(&server, &tenant).await?;

    for body in [
        Vec::new(),
        b"<svg onload=alert(1)></svg>".to_vec(),
        b"GIF89a".to_vec(),
    ] {
        let response = upload(&server, &tenant, &session, body).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert_eq!(error_code(response).await?, "invalid_request");
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_uploads_over_one_mebibyte() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = signed_up(&server, &tenant).await?;
    let oversized = vec![0; MAX_UPLOAD_BYTES.saturating_add(1)];

    let response = upload(&server, &tenant, &session, oversized).await?;

    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(error_code(response).await?, "payload_too_large");
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn uploading_requires_a_logged_in_user() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let response = server
        .client
        .put(server.url("/auth/v1/user/avatar"))
        .header("apikey", &tenant.publishable_key)
        .body(png(16, 16)?)
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn photos_are_isolated_per_tenant_and_need_the_publishable_key() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let other_tenant = server.create_tenant().await?;
    let session = signed_up(&server, &tenant).await?;
    upload(&server, &tenant, &session, png(32, 32)?)
        .await?
        .error_for_status()?;

    let with_secret_key = fetch(&server, &tenant.secret_key, &session).await?;
    assert_eq!(with_secret_key.status(), StatusCode::BAD_REQUEST);
    let from_other_tenant = fetch(&server, &other_tenant.publishable_key, &session).await?;
    assert_eq!(from_other_tenant.status(), StatusCode::NOT_FOUND);
    let with_unknown_key = fetch(&server, "nc_pk_unknown", &session).await?;
    assert_eq!(with_unknown_key.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&other_tenant).await?;
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn deleting_the_account_deletes_the_photo() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = signed_up(&server, &tenant).await?;
    upload(&server, &tenant, &session, png(32, 32)?)
        .await?
        .error_for_status()?;

    server
        .client
        .delete(server.url("/auth/v1/user"))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&session.access_token)
        .send()
        .await?
        .error_for_status()?;

    let served = fetch(&server, &tenant.publishable_key, &session).await?;
    assert_eq!(served.status(), StatusCode::NOT_FOUND);
    server.drop_tenant(&tenant).await
}
