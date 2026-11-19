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

async fn select_mascot(
    server: &TestServer,
    account: &Session,
    selection: (&str, i16),
) -> TestResult<Response> {
    let (project_id, mascot_id) = selection;
    let response = server
        .client
        .patch(server.url("/auth/v1/admin/settings"))
        .bearer_auth(&account.access_token)
        .header(PROJECT_HEADER, project_id)
        .json(&json!({ "mascot_id": mascot_id }))
        .send()
        .await?;

    Ok(response)
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
    assert_eq!(field(&first_project, "/mascot_id"), 0);

    let settings = in_project(&server, &owner, &project_id, "/auth/v1/admin/settings").await?;
    assert_eq!(settings.status(), StatusCode::OK);
    let settings: Value = settings.json().await?;
    assert_eq!(
        field(&first_project, "/require_email_verification"),
        field(&settings, "/require_email_verification")
    );

    let changed = select_mascot(&server, &owner, (&project_id, 32)).await?;
    assert_eq!(changed.status(), StatusCode::OK);
    let updated: Value = list_projects(&server, &owner).await?.json().await?;
    assert_eq!(field(&updated, "/0/mascot_id"), 32);

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
    let stranger = server
        .sign_up_console_account(&platform, &unique_email("stranger"))
        .await?;
    let created = create_project(&server, &owner).await?;
    let project_id = field(&created, "/tenant_id")
        .as_str()
        .unwrap_or_default()
        .to_owned();

    let read = in_project(&server, &stranger, &project_id, "/auth/v1/admin/settings").await?;
    assert_eq!(error_code(read).await?, "project_access_denied");
    let change = select_mascot(&server, &stranger, (&project_id, 12)).await?;
    assert_eq!(error_code(change).await?, "project_access_denied");
    let delete = delete_project(&server, &stranger, &project_id).await?;
    assert_eq!(delete.status(), StatusCode::FORBIDDEN);

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

/// Without an email provider the platform tenant can leave verification off: unverified
/// console accounts then manage projects like any other.
#[tokio::test]
async fn unverified_accounts_work_while_the_platform_does_not_require_verification() -> TestResult {
    let server = TestServer::start().await?;
    let platform = server
        .create_tenant_with_slug(&server.platform_slug)
        .await?;
    let unverified = server
        .sign_up(&platform, &unique_email("unverified"))
        .await?;

    let projects = list_projects(&server, &unverified).await?;

    assert_eq!(projects.status(), StatusCode::OK);
    server.drop_tenant(&platform).await
}

/// Once the platform requires verification, accounts made before keep logging in but must
/// confirm their email; the error says so instead of "invalid token".
#[tokio::test]
async fn unverified_accounts_are_asked_to_confirm_once_the_platform_requires_it() -> TestResult {
    let server = TestServer::start().await?;
    let platform = server
        .create_tenant_with_slug(&server.platform_slug)
        .await?;
    let unverified = server
        .sign_up(&platform, &unique_email("unverified"))
        .await?;
    server
        .client
        .patch(server.url("/auth/v1/admin/settings"))
        .header("apikey", &platform.secret_key)
        .json(&json!({ "require_email_verification": true }))
        .send()
        .await?
        .error_for_status()?;

    let projects = list_projects(&server, &unverified).await?;

    assert_eq!(projects.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(projects).await?, "email_not_verified");
    server.drop_tenant(&platform).await
}

async fn list_projects(server: &TestServer, account: &Session) -> TestResult<Response> {
    as_account(
        server,
        account,
        (Method::GET, "/platform/v1/projects", None),
    )
    .await
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

/// Each project is a database, so one client cannot create them in a burst.
#[tokio::test]
async fn project_creation_is_rate_limited_per_client() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("busy"))
        .await?;
    let mut project_ids = Vec::new();

    for _ in 0..3 {
        let created = create_project(&server, &owner).await?;
        project_ids.push(
            field(&created, "/tenant_id")
                .as_str()
                .unwrap_or_default()
                .to_owned(),
        );
    }

    let body = json!({ "slug": random_slug(), "name": "One too many", "site_url": TEST_SITE_URL });
    let refused = as_account(
        &server,
        &owner,
        (Method::POST, "/platform/v1/projects", Some(body)),
    )
    .await?;
    assert_eq!(refused.status(), StatusCode::TOO_MANY_REQUESTS);

    for project_id in &project_ids {
        delete_project(&server, &owner, project_id).await?;
    }

    server.drop_tenant(&platform).await
}
