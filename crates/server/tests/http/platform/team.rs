use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};
use tokio::io::AsyncWriteExt;
use tokio::net::TcpListener;

use crate::stress::metrics::{Load, exercise, status};
use crate::support::{
    Session, TEST_SITE_URL, TestResult, TestServer, error_code, field, random_slug, unique_email,
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

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "drives team writes and reads against disposable test services"]
async fn stress_team_invitations_and_readback() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("stress-team-owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let invites = 20;
    let reads = 320;
    let writes = exercise("team-invite", Load::burst(invites, 10), async |_| {
        let email = unique_email("stress-invite");
        status(invite(&server, &owner, &project_id, &email).await?).await
    })
    .await?;
    let accepted = writes.count("201");
    let listed = exercise("team-list", Load::burst(reads, 24), async |_| {
        let team = read_team(&server, &owner, &project_id).await?;
        assert_eq!(field(&team, "/members").as_array().map(Vec::len), Some(1));
        assert_eq!(
            field(&team, "/invitations").as_array().map(Vec::len),
            Some(accepted)
        );

        Ok("200".to_owned())
    })
    .await;

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await?;
    writes.require_only(&["201", "429 too_many_requests"])?;
    assert!(accepted >= 10);
    assert!(writes.count("429 too_many_requests") > 0);

    listed?.require(&[("200", reads)])
}

#[tokio::test]
async fn invited_accounts_accept_and_owners_remove_them() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let guest_email = unique_email("guest");
    let guest = server
        .sign_up_console_account(&platform, &guest_email)
        .await?;
    let project_id = create_project(&server, &owner).await?;

    let invited = invite(&server, &owner, &project_id, &guest_email.to_uppercase()).await?;
    assert_eq!(invited.status(), StatusCode::CREATED);
    let again = invite(&server, &owner, &project_id, &guest_email).await?;
    assert_eq!(again.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(again).await?, "already_invited");

    let received = my_invitations(&server, &guest).await?;
    let invitation = match received.as_slice() {
        [invitation] => invitation,
        _ => return Err("expected one invitation".into()),
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
    let guest = server
        .sign_up_console_account(&platform, &guest_email)
        .await?;
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
    let stranger = server
        .sign_up_console_account(&platform, &unique_email("stranger"))
        .await?;
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

/// Signs a new console account up, invites it and accepts, so it is a member of the project.
async fn join_as_member(
    server: &TestServer,
    platform: &crate::support::CreatedTenant,
    owner: &Session,
    project_id: &str,
) -> TestResult<Session> {
    let email = unique_email("teammate");
    let member = server.sign_up_console_account(platform, &email).await?;
    invite(server, owner, project_id, &email)
        .await?
        .error_for_status()?;
    let received = my_invitations(server, &member).await?;
    let invitation = match received.as_slice() {
        [invitation] => invitation,
        _ => return Err("expected one invitation".into()),
    };
    let accept_path = format!(
        "/platform/v1/invitations/{}/accept",
        text_at(invitation, "/id")
    );
    as_account(server, &member, (Method::POST, &accept_path, None))
        .await?
        .error_for_status()?;

    Ok(member)
}

async fn change_role(
    server: &TestServer,
    actor: &Session,
    target: (&str, &Session),
    role: &str,
) -> TestResult<Response> {
    let (project_id, member) = target;
    let path = format!(
        "/platform/v1/projects/{project_id}/members/{}",
        member.user.id
    );

    as_account(
        server,
        actor,
        (Method::PATCH, &path, Some(json!({ "role": role }))),
    )
    .await
}

async fn leave(server: &TestServer, account: &Session, project_id: &str) -> TestResult<Response> {
    let path = format!("/platform/v1/projects/{project_id}/membership");

    as_account(server, account, (Method::DELETE, &path, None)).await
}

#[tokio::test]
async fn owners_promote_members_who_can_then_manage_the_team() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let member = join_as_member(&server, &platform, &owner, &project_id).await?;

    let by_member = change_role(&server, &member, (&project_id, &owner), "member").await?;
    assert_eq!(by_member.status(), StatusCode::FORBIDDEN);
    let promoted = change_role(&server, &owner, (&project_id, &member), "owner").await?;
    assert_eq!(promoted.status(), StatusCode::NO_CONTENT);
    let unchanged = change_role(&server, &owner, (&project_id, &member), "owner").await?;
    assert_eq!(unchanged.status(), StatusCode::NO_CONTENT);
    let audit: Value = server
        .client
        .get(server.url("/auth/v1/admin/audit-events"))
        .bearer_auth(&owner.access_token)
        .header("x-nelcota-project", &project_id)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let events = field(&audit, "/events")
        .as_array()
        .ok_or("expected audit events")?;
    assert_eq!(
        events
            .iter()
            .filter(|event| field(event, "/action") == "member_role_changed")
            .count(),
        1
    );

    let team = read_team(&server, &member, &project_id).await?;
    assert_eq!(field(&team, "/can_manage"), true);
    let invited = invite(&server, &member, &project_id, &unique_email("next")).await?;
    assert_eq!(invited.status(), StatusCode::CREATED);

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn a_project_always_keeps_an_owner() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let member = join_as_member(&server, &platform, &owner, &project_id).await?;

    let self_demotion = change_role(&server, &owner, (&project_id, &owner), "member").await?;
    assert_eq!(self_demotion.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(self_demotion).await?, "last_owner");
    let sole_owner_leaves = leave(&server, &owner, &project_id).await?;
    assert_eq!(sole_owner_leaves.status(), StatusCode::CONFLICT);

    change_role(&server, &owner, (&project_id, &member), "owner")
        .await?
        .error_for_status()?;
    let owner_leaves = leave(&server, &owner, &project_id).await?;
    assert_eq!(owner_leaves.status(), StatusCode::NO_CONTENT);

    let team = read_team(&server, &member, &project_id).await?;
    assert_eq!(field(&team, "/members").as_array().map(Vec::len), Some(1));
    let last_owner_leaves = leave(&server, &member, &project_id).await?;
    assert_eq!(last_owner_leaves.status(), StatusCode::CONFLICT);

    delete_project(&server, &member, &project_id).await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn account_deletion_preserves_the_last_active_project_owner() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let member = join_as_member(&server, &platform, &owner, &project_id).await?;
    let delete_self = || {
        server
            .client
            .delete(server.url("/auth/v1/user"))
            .header("apikey", &platform.publishable_key)
            .bearer_auth(&owner.access_token)
            .send()
    };
    let refused = delete_self().await?;
    assert_eq!(refused.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(refused).await?, "last_owner");

    let admin = server
        .client
        .delete(server.url(&format!("/auth/v1/admin/users/{}", owner.user.id)))
        .header("apikey", &platform.secret_key)
        .send()
        .await?;
    assert_eq!(admin.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(admin).await?, "last_owner");

    change_role(&server, &owner, (&project_id, &member), "owner")
        .await?
        .error_for_status()?;
    assert_eq!(delete_self().await?.status(), StatusCode::NO_CONTENT);
    let team = read_team(&server, &member, &project_id).await?;
    assert_eq!(field(&team, "/members").as_array().map(Vec::len), Some(1));
    assert_eq!(
        text_at(&team, "/members/0/account_id"),
        member.user.id.to_string()
    );
    assert_eq!(
        leave(&server, &member, &project_id).await?.status(),
        StatusCode::CONFLICT
    );

    delete_project(&server, &member, &project_id).await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn accepting_an_invitation_concurrently_with_a_new_invite_leaves_one_membership() -> TestResult
{
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let email = unique_email("guest");
    let member = server.sign_up_console_account(&platform, &email).await?;
    let initial: Value = invite(&server, &owner, &project_id, &email)
        .await?
        .error_for_status()?
        .json()
        .await?;
    let accept = format!(
        "/platform/v1/invitations/{}/accept",
        text_at(&initial, "/id")
    );
    let (accepted, duplicate) = tokio::try_join!(
        as_account(&server, &member, (Method::POST, &accept, None)),
        invite(&server, &owner, &project_id, &email),
    )?;
    assert_eq!(accepted.status(), StatusCode::OK);
    assert_eq!(duplicate.status(), StatusCode::CONFLICT);
    let team = read_team(&server, &owner, &project_id).await?;
    assert_eq!(field(&team, "/invitations"), &json!([]));
    assert_eq!(field(&team, "/members").as_array().map(Vec::len), Some(2));

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn failed_invitation_mail_can_be_resent_without_creating_another_invitation() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let smtp = format!("smtp://{}", listener.local_addr()?);
    let reject_mail = tokio::spawn(async move {
        while let Ok((mut stream, _)) = listener.accept().await {
            // The sender's TCP probe may close before reading the greeting.
            let _greeting = stream.write_all(b"421 Test SMTP unavailable\r\n").await;
        }
    });
    let settings = server.url("/auth/v1/admin/smtp");
    server
        .client
        .put(&settings)
        .header("apikey", &platform.secret_key)
        .json(&json!({ "smtp_url": smtp, "email_from": "platform@example.test" }))
        .send()
        .await?
        .error_for_status()?;
    let email = unique_email("retry-invitation");
    let initial: Value = invite(&server, &owner, &project_id, &email)
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&initial, "/delivery_status"), "failed");
    let id = text_at(&initial, "/id");
    let team = read_team(&server, &owner, &project_id).await?;
    assert_eq!(field(&team, "/invitations/0/delivery_status"), "failed");

    server
        .client
        .delete(&settings)
        .header("apikey", &platform.secret_key)
        .send()
        .await?
        .error_for_status()?;
    reject_mail.abort();
    let path = format!("/platform/v1/projects/{project_id}/invitations/{id}/resend");
    let resent: Value = as_account(&server, &owner, (Method::POST, &path, None))
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(text_at(&resent, "/id"), id);
    assert_eq!(field(&resent, "/delivery_status"), "sent");
    let team = read_team(&server, &owner, &project_id).await?;
    assert_eq!(
        field(&team, "/invitations").as_array().map(Vec::len),
        Some(1)
    );

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn members_leave_and_lose_access() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let member = join_as_member(&server, &platform, &owner, &project_id).await?;

    let left = leave(&server, &member, &project_id).await?;
    assert_eq!(left.status(), StatusCode::NO_CONTENT);
    let again = leave(&server, &member, &project_id).await?;
    assert_eq!(again.status(), StatusCode::NOT_FOUND);
    let path = format!("/platform/v1/projects/{project_id}/team");
    let team = as_account(&server, &member, (Method::GET, &path, None)).await?;
    assert_eq!(team.status(), StatusCode::FORBIDDEN);

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn owners_hand_the_project_over_in_one_step() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let member = join_as_member(&server, &platform, &owner, &project_id).await?;
    let path = format!("/platform/v1/projects/{project_id}/ownership-transfer");

    let to_self = json!({ "account_id": owner.user.id });
    let refused = as_account(&server, &owner, (Method::POST, &path, Some(to_self))).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);
    let by_member = json!({ "account_id": owner.user.id });
    let forbidden = as_account(&server, &member, (Method::POST, &path, Some(by_member))).await?;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let to_member = json!({ "account_id": member.user.id });
    let handed = as_account(&server, &owner, (Method::POST, &path, Some(to_member))).await?;
    assert_eq!(handed.status(), StatusCode::NO_CONTENT);

    let team = read_team(&server, &member, &project_id).await?;
    assert_eq!(field(&team, "/can_manage"), true);
    let former = read_team(&server, &owner, &project_id).await?;
    assert_eq!(field(&former, "/can_manage"), false);
    // The console records an account's email on its memberships when it lists its projects.
    as_account(
        &server,
        &owner,
        (Method::GET, "/platform/v1/projects", None),
    )
    .await?
    .error_for_status()?;
    let already_member = invite(&server, &member, &project_id, &owner.user.email).await?;
    assert_eq!(error_code(already_member).await?, "already_member");

    delete_project(&server, &member, &project_id).await?;
    server.drop_tenant(&platform).await
}

async fn as_project_member(
    server: &TestServer,
    (account, project_id): (&Session, &str),
    request: (Method, &str, Option<Value>),
) -> TestResult<Response> {
    let (method, path, body) = request;
    let mut builder = server
        .client
        .request(method, server.url(path))
        .bearer_auth(&account.access_token)
        .header("x-nelcota-project", project_id);

    if let Some(body) = body {
        builder = builder.json(&body);
    }

    Ok(builder.send().await?)
}

#[tokio::test]
async fn viewers_read_the_project_and_change_nothing() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let project_id = create_project(&server, &owner).await?;
    let viewer = join_as_member(&server, &platform, &owner, &project_id).await?;
    let demoted = change_role(&server, &owner, (&project_id, &viewer), "viewer").await?;
    assert_eq!(demoted.status(), StatusCode::NO_CONTENT);
    let as_viewer = (&viewer, project_id.as_str());

    let settings = as_project_member(
        &server,
        as_viewer,
        (Method::GET, "/auth/v1/admin/settings", None),
    )
    .await?;
    assert_eq!(settings.status(), StatusCode::OK);
    let renamed = as_project_member(
        &server,
        as_viewer,
        (
            Method::PATCH,
            "/auth/v1/admin/settings",
            Some(json!({ "name": "Renamed" })),
        ),
    )
    .await?;
    assert_eq!(renamed.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(renamed).await?, "read_only_member");
    let query = as_project_member(
        &server,
        as_viewer,
        (
            Method::POST,
            "/database/v1/sql",
            Some(json!({ "query": "select 1" })),
        ),
    )
    .await?;
    assert_eq!(query.status(), StatusCode::FORBIDDEN);

    let team = read_team(&server, &viewer, &project_id).await?;
    assert_eq!(field(&team, "/can_manage"), false);
    let by_viewer = change_role(&server, &viewer, (&project_id, &viewer), "member").await?;
    assert_eq!(by_viewer.status(), StatusCode::FORBIDDEN);
    let removed_path = format!(
        "/platform/v1/projects/{project_id}/members/{}",
        viewer.user.id
    );
    let removed = as_account(&server, &owner, (Method::DELETE, &removed_path, None)).await?;
    assert_eq!(removed.status(), StatusCode::NO_CONTENT);

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}
