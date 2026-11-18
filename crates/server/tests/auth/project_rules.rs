//! Edge cases of project ownership, membership and console accounts.

use std::time::Duration;

use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};
use sqlx::{Connection, PgConnection, Postgres, Transaction};
use uuid::Uuid;

use crate::support::{
    Session, TEST_SITE_URL, TestResult, TestServer, error_code, field, random_slug, unique_email,
};

/// The most projects one account may own (`MAX_OWNED_PROJECTS`).
const OWNED_PROJECT_LIMIT: usize = 10;

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
    let body = json!({ "slug": random_slug(), "name": "Rules", "site_url": TEST_SITE_URL });
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

async fn delete_project(
    server: &TestServer,
    account: &Session,
    project_id: &str,
) -> TestResult<Response> {
    let path = format!("/platform/v1/projects/{project_id}");

    as_account(server, account, (Method::DELETE, &path, None)).await
}

/// Invites `account` to the project and answers the invitation as that account.
async fn invite_and_accept(
    server: &TestServer,
    (owner, account): (&Session, &Session),
    project_id: &str,
) -> TestResult<Response> {
    let path = format!("/platform/v1/projects/{project_id}/invitations");
    let invitation = json!({ "email": account.user.email });
    as_account(server, owner, (Method::POST, &path, Some(invitation)))
        .await?
        .error_for_status()?;
    let received: Vec<Value> = as_account(
        server,
        account,
        (Method::GET, "/platform/v1/invitations", None),
    )
    .await?
    .json()
    .await?;
    let [invitation] = received.as_slice() else {
        return Err("expected one invitation".into());
    };
    let accept = format!(
        "/platform/v1/invitations/{}/accept",
        text_at(invitation, "/id")
    );

    as_account(server, account, (Method::POST, &accept, None)).await
}

fn text_at(value: &Value, pointer: &str) -> String {
    field(value, pointer)
        .as_str()
        .unwrap_or_default()
        .to_owned()
}

/// Only owners delete a project, and the check follows ownership as it is now: an owner who
/// handed the project over loses the right at once.
#[tokio::test]
async fn members_and_former_owners_cannot_delete_the_project() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let member = server
        .sign_up_console_account(&platform, &unique_email("member"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    invite_and_accept(&server, (&owner, &member), &project_id)
        .await?
        .error_for_status()?;

    let by_member = delete_project(&server, &member, &project_id).await?;
    assert_eq!(error_code(by_member).await?, "project_access_denied");
    let transfer = format!("/platform/v1/projects/{project_id}/ownership-transfer");
    let to_member = json!({ "account_id": member.user.id });
    as_account(&server, &owner, (Method::POST, &transfer, Some(to_member)))
        .await?
        .error_for_status()?;
    let by_former_owner = delete_project(&server, &owner, &project_id).await?;
    assert_eq!(error_code(by_former_owner).await?, "project_access_denied");

    let by_new_owner = delete_project(&server, &member, &project_id).await?;
    assert_eq!(by_new_owner.status(), StatusCode::NO_CONTENT);
    server.drop_tenant(&platform).await
}

/// The platform may let unverified accounts in, but joining someone else's project always
/// needs a proven inbox: the invitation was sent to an email address.
#[tokio::test]
async fn unverified_accounts_cannot_accept_invitations() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let unverified = server
        .sign_up(&platform, &unique_email("unverified"))
        .await?;
    let project_id = create_project(&server, &owner).await?;

    let accepted = invite_and_accept(&server, (&owner, &unverified), &project_id).await?;

    assert_eq!(accepted.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(accepted).await?, "email_not_verified");
    delete_project(&server, &owner, &project_id)
        .await?
        .error_for_status()?;
    server.drop_tenant(&platform).await
}

/// A ban in the platform tenant locks the account out of the console on its next request,
/// even with an access token issued before the ban.
#[tokio::test]
async fn banned_console_accounts_are_refused() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, account) = server
        .create_platform_account(&unique_email("banned"))
        .await?;
    server
        .ban_without_ending_sessions(&platform, account.user.id)
        .await?;

    let projects = as_account(
        &server,
        &account,
        (Method::GET, "/platform/v1/projects", None),
    )
    .await?;

    assert_eq!(projects.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(projects).await?, "user_banned");
    server.drop_tenant(&platform).await
}

/// Promotion counts toward the owned-project limit like creation does, so an account cannot
/// collect projects by being promoted.
#[tokio::test]
async fn promotion_respects_the_owned_project_limit() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let member = server
        .sign_up_console_account(&platform, &unique_email("collector"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    invite_and_accept(&server, (&owner, &member), &project_id)
        .await?
        .error_for_status()?;
    let placeholders = own_placeholder_projects(&server, member.user.id).await?;

    let path = format!(
        "/platform/v1/projects/{project_id}/members/{}",
        member.user.id
    );
    let promoted = as_account(
        &server,
        &owner,
        (Method::PATCH, &path, Some(json!({ "role": "owner" }))),
    )
    .await?;

    assert_eq!(error_code(promoted).await?, "owned_project_limit");
    delete_placeholder_projects(&server, &placeholders).await?;
    delete_project(&server, &owner, &project_id)
        .await?
        .error_for_status()?;
    server.drop_tenant(&platform).await
}

/// Rows only, without databases: creating ten real projects would hit the creation rate limit.
async fn own_placeholder_projects(server: &TestServer, account_id: Uuid) -> TestResult<Vec<Uuid>> {
    let mut control_plane = server.control_plane().await?;
    let mut project_ids = Vec::with_capacity(OWNED_PROJECT_LIMIT);

    for _ in 0..OWNED_PROJECT_LIMIT {
        let project_id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO tenants (id, slug, name, site_url) VALUES ($1, $2, 'Placeholder', $3)",
        )
        .bind(project_id)
        .bind(random_slug())
        .bind(TEST_SITE_URL)
        .execute(&mut control_plane)
        .await?;
        sqlx::query(
            "INSERT INTO tenant_members (tenant_id, account_id, role) VALUES ($1, $2, 'owner')",
        )
        .bind(project_id)
        .bind(account_id)
        .execute(&mut control_plane)
        .await?;
        project_ids.push(project_id);
    }

    control_plane.close().await?;

    Ok(project_ids)
}

async fn delete_placeholder_projects(server: &TestServer, project_ids: &[Uuid]) -> TestResult {
    let mut control_plane = server.control_plane().await?;
    sqlx::query("DELETE FROM tenants WHERE id = ANY($1)")
        .bind(project_ids)
        .execute(&mut control_plane)
        .await?;
    control_plane.close().await?;

    Ok(())
}

/// Polls for the deletion's ownership check waiting on the membership locks: proof the check
/// runs inside the deletion's transaction, under a lock, and not before it.
async fn wait_for_blocked_ownership_check(server: &TestServer) -> TestResult {
    let mut observer = server.control_plane().await?;

    for _ in 0..100 {
        let is_blocked: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock' \
             AND query LIKE '%tenant_members%' AND query LIKE '%ORDER BY account_id FOR UPDATE%')",
        )
        .fetch_one(&mut observer)
        .await?;

        if is_blocked {
            observer.close().await?;
            return Ok(());
        }

        tokio::time::sleep(Duration::from_millis(50)).await;
    }

    Err("the deletion never waited for the membership locks".into())
}

/// Hands the project over inside `transfer`, like `POST .../ownership-transfer` does.
async fn swap_roles(
    transfer: &mut PgConnection,
    project_id: Uuid,
    former_owner: Uuid,
) -> TestResult {
    sqlx::query(
        "UPDATE tenant_members SET role = CASE WHEN account_id = $2 THEN 'member' ELSE 'owner' END \
         WHERE tenant_id = $1",
    )
    .bind(project_id)
    .bind(former_owner)
    .execute(transfer)
    .await?;

    Ok(())
}

/// Hands the project over once the deletion waits on the locks. If it never does (the check
/// does not lock), the locks are released anyway, so the test fails instead of hanging.
async fn finish_transfer(
    server: &TestServer,
    mut locks: Transaction<'_, Postgres>,
    (project_id, former_owner): (Uuid, Uuid),
) -> TestResult {
    if let Err(error) = wait_for_blocked_ownership_check(server).await {
        locks.rollback().await?;
        return Err(error);
    }

    swap_roles(&mut locks, project_id, former_owner).await?;
    locks.commit().await?;

    Ok(())
}

/// A transfer holds every membership of the project while it runs. A deletion by the owner
/// that arrives meanwhile must wait for it and then see it is no longer the owner, instead of
/// deleting the project its new owner now holds.
#[tokio::test]
async fn a_deletion_waits_for_a_transfer_in_progress_and_then_refuses() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let member = server
        .sign_up_console_account(&platform, &unique_email("heir"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    invite_and_accept(&server, (&owner, &member), &project_id)
        .await?
        .error_for_status()?;
    let project_uuid = Uuid::parse_str(&project_id)?;
    let mut transfer = server.control_plane().await?;
    let mut locks = transfer.begin().await?;
    sqlx::query("SELECT role FROM tenant_members WHERE tenant_id = $1 FOR UPDATE")
        .bind(project_uuid)
        .fetch_all(&mut *locks)
        .await?;

    let handover = (project_uuid, owner.user.id);
    let (deletion, transferred) = tokio::join!(
        delete_project(&server, &owner, &project_id),
        finish_transfer(&server, locks, handover)
    );
    transferred?;

    assert_eq!(error_code(deletion?).await?, "project_access_denied");
    transfer.close().await?;
    delete_project(&server, &member, &project_id)
        .await?
        .error_for_status()?;
    server.drop_tenant(&platform).await
}
