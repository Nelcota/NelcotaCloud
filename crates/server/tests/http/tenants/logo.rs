use std::io::Cursor;

use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
use reqwest::{RequestBuilder, Response, StatusCode};
use serde_json::{Value, json};

use crate::support::{
    CreatedTenant, Session, TEST_SITE_URL, TestResult, TestServer, error_code, field, random_slug,
    unique_email,
};

const LOGO_PATH: &str = "/auth/v1/admin/logo";
const SETTINGS_PATH: &str = "/auth/v1/admin/settings";
const PROJECT_HEADER: &str = "x-nelcota-project";
const STORED_SIZE: u32 = 256;

fn png(width: u32, height: u32) -> TestResult<Vec<u8>> {
    let image = RgbaImage::from_pixel(width, height, Rgba([200, 60, 20, 255]));
    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(image).write_to(&mut bytes, ImageFormat::Png)?;

    Ok(bytes.into_inner())
}

fn with_secret_key(request: RequestBuilder, tenant: &CreatedTenant) -> RequestBuilder {
    request.header("apikey", &tenant.secret_key)
}

async fn upload(
    server: &TestServer,
    tenant: &CreatedTenant,
    image: Vec<u8>,
) -> TestResult<Response> {
    let request = server
        .client
        .put(server.url(LOGO_PATH))
        .header("content-type", "application/octet-stream")
        .body(image);

    Ok(with_secret_key(request, tenant).send().await?)
}

async fn admin_get(
    server: &TestServer,
    tenant: &CreatedTenant,
    path: &str,
) -> TestResult<Response> {
    let request = server.client.get(server.url(path));

    Ok(with_secret_key(request, tenant).send().await?)
}

async fn remove(server: &TestServer, tenant: &CreatedTenant) -> TestResult<Response> {
    let request = server.client.delete(server.url(LOGO_PATH));

    Ok(with_secret_key(request, tenant).send().await?)
}

async fn logo_version(server: &TestServer, tenant: &CreatedTenant) -> TestResult<Value> {
    let settings: Value = admin_get(server, tenant, SETTINGS_PATH)
        .await?
        .error_for_status()?
        .json()
        .await?;

    Ok(field(&settings, "/logo_updated_at").clone())
}

#[tokio::test]
async fn uploaded_logo_is_served_as_a_small_square_jpeg() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    assert!(logo_version(&server, &tenant).await?.is_null());

    let uploaded = upload(&server, &tenant, png(800, 300)?).await?;
    assert_eq!(uploaded.status(), StatusCode::OK);
    let view: Value = uploaded.json().await?;
    assert!(field(&view, "/updated_at").is_string());

    let served = admin_get(&server, &tenant, LOGO_PATH).await?;
    assert_eq!(served.status(), StatusCode::OK);
    assert_eq!(served.headers()["content-type"], "image/jpeg");
    assert_eq!(served.headers()["x-content-type-options"], "nosniff");
    let logo = image::load_from_memory(&served.bytes().await?)?;
    assert_eq!((logo.width(), logo.height()), (STORED_SIZE, STORED_SIZE));
    assert_eq!(
        &logo_version(&server, &tenant).await?,
        field(&view, "/updated_at")
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn removing_the_logo_stops_serving_it() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    upload(&server, &tenant, png(64, 64)?)
        .await?
        .error_for_status()?;

    let removed = remove(&server, &tenant).await?;
    assert_eq!(removed.status(), StatusCode::NO_CONTENT);
    let removed_again = remove(&server, &tenant).await?;
    assert_eq!(removed_again.status(), StatusCode::NO_CONTENT);

    let served = admin_get(&server, &tenant, LOGO_PATH).await?;
    assert_eq!(served.status(), StatusCode::NOT_FOUND);
    assert!(logo_version(&server, &tenant).await?.is_null());
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_files_that_are_not_images() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    for body in [
        Vec::new(),
        b"<svg onload=alert(1)></svg>".to_vec(),
        b"GIF89a".to_vec(),
    ] {
        let response = upload(&server, &tenant, body).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert_eq!(error_code(response).await?, "invalid_request");
    }

    let oversized = vec![0; 1024 * 1024 + 1];
    let response = upload(&server, &tenant, oversized).await?;
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn the_publishable_key_cannot_change_the_logo() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let response = server
        .client
        .put(server.url(LOGO_PATH))
        .header("apikey", &tenant.publishable_key)
        .body(png(32, 32)?)
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}

async fn create_project(server: &TestServer, account: &Session) -> TestResult<String> {
    let body = json!({ "slug": random_slug(), "name": "Logo project", "site_url": TEST_SITE_URL });
    let created: Value = server
        .client
        .post(server.url("/platform/v1/projects"))
        .bearer_auth(&account.access_token)
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    Ok(field(&created, "/tenant_id")
        .as_str()
        .unwrap_or_default()
        .to_owned())
}

async fn upload_as(
    server: &TestServer,
    account: &Session,
    project_id: &str,
) -> TestResult<Response> {
    let response = server
        .client
        .put(server.url(LOGO_PATH))
        .bearer_auth(&account.access_token)
        .header(PROJECT_HEADER, project_id)
        .body(png(48, 48)?)
        .send()
        .await?;

    Ok(response)
}

#[tokio::test]
async fn members_set_the_logo_and_see_it_in_their_project_list() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("logo-owner"))
        .await?;
    let stranger = server
        .sign_up_console_account(&platform, &unique_email("logo-stranger"))
        .await?;
    let project_id = create_project(&server, &owner).await?;

    let refused = upload_as(&server, &stranger, &project_id).await?;
    assert_eq!(error_code(refused).await?, "project_access_denied");
    let uploaded = upload_as(&server, &owner, &project_id).await?;
    assert_eq!(uploaded.status(), StatusCode::OK);
    let view: Value = uploaded.json().await?;

    let projects: Value = server
        .client
        .get(server.url("/platform/v1/projects"))
        .bearer_auth(&owner.access_token)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(
        field(&projects, "/0/logo_updated_at"),
        field(&view, "/updated_at")
    );

    let path = format!("/platform/v1/projects/{project_id}");
    server
        .client
        .delete(server.url(&path))
        .bearer_auth(&owner.access_token)
        .send()
        .await?
        .error_for_status()?;
    server.drop_tenant(&platform).await
}
