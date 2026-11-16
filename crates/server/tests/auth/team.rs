use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};

use crate::support::{
    Session, TEST_SITE_URL, TestResult, TestServer, field, random_slug, unique_email,
};

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

async fn create_project(server: &TestServer, owner: &Session) -> TestResult<String> {
    let body = json!({ "slug": random_slug(), "name": "Team project", "site_url": TEST_SITE_URL });
    let response = as_account(
        server,
        owner,
        (Method::POST, "/platform/v1/projects", Some(body)),
    )
    .await?;
    assert_eq!(response.status(), StatusCode::CREATED);
    let created: Value = response.json().await?;

    Ok(text_at(&created, "/tenant_id"))
}

async fn invite(
    server: &TestServer,
    owner: &Session,
    project_id: &str,
    email: &str,
) -> TestResult<Response> {
    let path = format!("/platform/v1/projects/{project_id}/invitations");

    as_account(
        server,
        owner,
        (Method::POST, &path, Some(json!({ "email": email }))),
    )
    .await
}

async fn read_team(server: &TestServer, account: &Session, project_id: &str) -> TestResult<Value> {
    let path = format!("/platform/v1/projects/{project_id}/team");
    let response = as_account(server, account, (Method::GET, &path, None)).await?;
    assert_eq!(response.status(), StatusCode::OK);

    Ok(response.json().await?)
}

async fn my_invitations(server: &TestServer, account: &Session) -> TestResult<Vec<Value>> {
    let response = as_account(
        server,
        account,
        (Method::GET, "/platform/v1/invitations", None),
    )
    .await?;
    assert_eq!(response.status(), StatusCode::OK);

    Ok(response.json().await?)
}

async fn delete_project(server: &TestServer, owner: &Session, project_id: &str) -> TestResult {
    let path = format!("/platform/v1/projects/{project_id}");
    let response = as_account(server, owner, (Method::DELETE, &path, None)).await?;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    Ok(())
}

fn text_at(value: &Value, pointer: &str) -> String {
    field(value, pointer)
        .as_str()
        .unwrap_or_default()
        .to_owned()
}

#[tokio::test]
async fn invited_accounts_accept_and_owners_remove_them() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let guest_email = unique_email("guest");
    let guest = server.sign_up(&platform, &guest_email).await?;
    let project_id = create_project(&server, &owner).await?;

    let invited = invite(&server, &owner, &project_id, &guest_email.to_uppercase()).await?;
    assert_eq!(invited.status(), StatusCode::CREATED);
    let again = invite(&server, &owner, &project_id, &guest_email).await?;
    assert_eq!(again.status(), StatusCode::CONFLICT);

    let received = my_invitations(&server, &guest).await?;
    let [invitation] = received.as_slice() else {
        return Err("expected one invitation".into());
    };
    assert_eq!(field(invitation, "/project_name"), "Team project");
    let accept_path = format!(
        "/platform/v1/invitations/{}/accept",
        text_at(invitation, "/id")
    );
    let accepted = as_account(&server, &guest, (Method::POST, &accept_path, None)).await?;
    assert_eq!(accepted.status(), StatusCode::OK);
    let reused = as_account(&server, &guest, (Method::POST, &accept_path, None)).await?;
    assert_eq!(reused.status(), StatusCode::NOT_FOUND);

    let team = read_team(&server, &guest, &project_id).await?;
    assert_eq!(field(&team, "/can_manage"), false);
    assert_eq!(field(&team, "/members").as_array().map(Vec::len), Some(2));
    assert_eq!(field(&team, "/invitations"), &json!([]));

    let guest_invites = invite(&server, &guest, &project_id, "someone@example.com").await?;
    assert_eq!(guest_invites.status(), StatusCode::FORBIDDEN);

    let owner_path = format!(
        "/platform/v1/projects/{project_id}/members/{}",
        owner.user.id
    );
    let owner_removal = as_account(&server, &owner, (Method::DELETE, &owner_path, None)).await?;
    assert_eq!(owner_removal.status(), StatusCode::NOT_FOUND);
    let guest_path = format!(
        "/platform/v1/projects/{project_id}/members/{}",
        guest.user.id
    );
    let removed = as_account(&server, &owner, (Method::DELETE, &guest_path, None)).await?;
    assert_eq!(removed.status(), StatusCode::NO_CONTENT);
    let after = as_account(
        &server,
        &guest,
        (
            Method::GET,
            &format!("/platform/v1/projects/{project_id}/team"),
            None,
        ),
    )
    .await?;
    assert_eq!(after.status(), StatusCode::FORBIDDEN);

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn invitations_can_be_withdrawn_or_declined() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let guest_email = unique_email("guest");
    let guest = server.sign_up(&platform, &guest_email).await?;
    let project_id = create_project(&server, &owner).await?;

    let first: Value = invite(&server, &owner, &project_id, &guest_email)
        .await?
        .json()
        .await?;
    let cancel_path = format!(
        "/platform/v1/projects/{project_id}/invitations/{}",
        text_at(&first, "/id")
    );
    let withdrawn = as_account(&server, &owner, (Method::DELETE, &cancel_path, None)).await?;
    assert_eq!(withdrawn.status(), StatusCode::NO_CONTENT);
    assert!(my_invitations(&server, &guest).await?.is_empty());

    let second: Value = invite(&server, &owner, &project_id, &guest_email)
        .await?
        .json()
        .await?;
    let decline_path = format!("/platform/v1/invitations/{}", text_at(&second, "/id"));
    let stranger = server.sign_up(&platform, &unique_email("stranger")).await?;
    let foreign = as_account(&server, &stranger, (Method::DELETE, &decline_path, None)).await?;
    assert_eq!(foreign.status(), StatusCode::NOT_FOUND);
    let declined = as_account(&server, &guest, (Method::DELETE, &decline_path, None)).await?;
    assert_eq!(declined.status(), StatusCode::NO_CONTENT);
    let team = read_team(&server, &owner, &project_id).await?;
    assert_eq!(field(&team, "/invitations"), &json!([]));

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn members_are_not_invited_twice() -> TestResult {
    let server = TestServer::start().await?;
    let owner_email = unique_email("owner");
    let (platform, owner) = server.create_platform_account(&owner_email).await?;
    let project_id = create_project(&server, &owner).await?;
    // Listing projects records the owner's email on the membership.
    let listed = as_account(
        &server,
        &owner,
        (Method::GET, "/platform/v1/projects", None),
    )
    .await?;
    assert_eq!(listed.status(), StatusCode::OK);

    let response = invite(&server, &owner, &project_id, &owner_email).await?;
    assert_eq!(response.status(), StatusCode::CONFLICT);
    let invalid = invite(&server, &owner, &project_id, "not-an-email").await?;
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}
