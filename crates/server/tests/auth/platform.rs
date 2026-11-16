use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};

use crate::support::{
    CreatedTenant, Session, TEST_SITE_URL, TestResult, TestServer, error_code, field, random_slug,
    unique_email,
};

const PROJECT_HEADER: &str = "x-nelcota-project";

async fn as_account(
    server: &TestServer,
    account: &Session,
    request: (Method, &str, Option<Value>),
) -> TestResult<Response> {
    let (method, path, body) = request;
    let mut builder = server
        .client
        .request(method, server.url(path))
        .bearer_auth(&account.access_token);

    if let Some(body) = body {
        builder = builder.json(&body);
    }

    Ok(builder.send().await?)
}

async fn in_project(
    server: &TestServer,
    account: &Session,
    project_id: &str,
    path: &str,
) -> TestResult<Response> {
    let response = server
        .client
        .get(server.url(path))
        .bearer_auth(&account.access_token)
        .header(PROJECT_HEADER, project_id)
        .send()
        .await?;

    Ok(response)
}

async fn create_project(server: &TestServer, account: &Session) -> TestResult<Value> {
    let body =
        json!({ "slug": random_slug(), "name": "Console project", "site_url": TEST_SITE_URL });
    let response = as_account(
        server,
        account,
        (Method::POST, "/platform/v1/projects", Some(body)),
    )
    .await?;
    assert_eq!(response.status(), StatusCode::CREATED);

    Ok(response.json().await?)
}

async fn delete_project(
    server: &TestServer,
    account: &Session,
    project_id: &str,
) -> TestResult<Response> {
    let path = format!("/platform/v1/projects/{project_id}");

    as_account(server, account, (Method::DELETE, &path, None)).await
}

#[tokio::test]
async fn answers_503_until_the_platform_tenant_exists() -> TestResult {
    let server = TestServer::start().await?;

    let response = server
        .client
        .get(server.url("/platform/v1/projects"))
        .bearer_auth("any-token")
        .send()
        .await?;

    assert_eq!(error_code(response).await?, "platform_not_configured");
    Ok(())
}

#[tokio::test]
async fn accounts_create_list_manage_and_delete_their_projects() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let created = create_project(&server, &owner).await?;
    let project_id = field(&created, "/tenant_id")
        .as_str()
        .unwrap_or_default()
        .to_owned();

    let projects: Vec<Value> = as_account(
        &server,
        &owner,
        (Method::GET, "/platform/v1/projects", None),
    )
    .await?
    .json()
    .await?;
    assert_eq!(projects.len(), 1);
    let first_project = projects.first().cloned().unwrap_or_default();
    assert_eq!(field(&first_project, "/role"), "owner");

    let settings = in_project(&server, &owner, &project_id, "/auth/v1/admin/settings").await?;
    assert_eq!(settings.status(), StatusCode::OK);
    let users = in_project(&server, &owner, &project_id, "/auth/v1/admin/users").await?;
    assert_eq!(users.status(), StatusCode::OK);

    let deleted = delete_project(&server, &owner, &project_id).await?;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn other_accounts_cannot_touch_a_project() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let stranger = server.sign_up(&platform, &unique_email("stranger")).await?;
    let created = create_project(&server, &owner).await?;
    let project_id = field(&created, "/tenant_id")
        .as_str()
        .unwrap_or_default()
        .to_owned();

    let read = in_project(&server, &stranger, &project_id, "/auth/v1/admin/settings").await?;
    assert_eq!(error_code(read).await?, "project_access_denied");
    let delete = delete_project(&server, &stranger, &project_id).await?;
    assert_eq!(delete.status(), StatusCode::FORBIDDEN);

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

/// A user of an ordinary tenant is not a console account, even with a valid token.
#[tokio::test]
async fn tokens_of_other_tenants_are_not_platform_accounts() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, _) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let tenant: CreatedTenant = server.create_tenant().await?;
    let outsider = server.sign_up(&tenant, &unique_email("outsider")).await?;

    let response = as_account(
        &server,
        &outsider,
        (Method::GET, "/platform/v1/projects", None),
    )
    .await?;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    server.drop_tenant(&tenant).await?;
    server.drop_tenant(&platform).await
}
