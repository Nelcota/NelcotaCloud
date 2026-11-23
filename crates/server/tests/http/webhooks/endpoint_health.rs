use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};
use server::modules::team::notification::webhook_failure_sweep::{
    SweepReport, sweep_failing_webhooks,
};
use uuid::Uuid;

use crate::support::{
    Session, TEST_SITE_URL, TestResult, TestServer, field, random_slug, unique_email,
};
use crate::webhooks::receiver::{WebhookReceiver, create_endpoint, send, text, webhooks_request};

#[tokio::test]
async fn names_an_endpoint_and_removes_the_name() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let body = json!({
        "url": "https://hooks.example.com/crm",
        "description": "  Sincronizar CRM  ",
        "event_types": ["user.created"],
    });
    let created: Value = send(webhooks_request(&server, &tenant, (Method::POST, "")).json(&body))
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(
        field(&created, "/endpoint/description"),
        &json!("Sincronizar CRM")
    );
    let path = format!("/{}", text(field(&created, "/endpoint/id"))?);

    let cleared: Value = send(
        webhooks_request(&server, &tenant, (Method::PATCH, &path))
            .json(&json!({ "description": " " })),
    )
    .await?
    .error_for_status()?
    .json()
    .await?;
    assert_eq!(field(&cleared, "/description"), &Value::Null);

    for bad in ["linha\nquebrada".to_owned(), "x".repeat(81)] {
        let change = json!({ "description": bad });
        let response =
            send(webhooks_request(&server, &tenant, (Method::PATCH, &path)).json(&change)).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{bad}");
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn tracks_failures_until_a_delivery_is_accepted() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::failing_once().await;
    let (endpoint_id, _) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    server.sign_up(&tenant, &unique_email("flaky")).await?;

    receiver.wait_for(1).await?;
    let failing = endpoint_until(&server, &tenant, &endpoint_id, |endpoint| {
        endpoint
            .pointer("/failing_since")
            .is_some_and(Value::is_string)
    })
    .await?;
    assert!(field(&failing, "/failing_since").is_string());

    // The first retry comes about 5 seconds after the failure, and is accepted.
    receiver.wait_for(2).await?;
    endpoint_until(&server, &tenant, &endpoint_id, |endpoint| {
        endpoint.pointer("/failing_since") == Some(&Value::Null)
    })
    .await?;

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn alerts_the_owners_then_pauses_an_endpoint_failing_for_days() -> TestResult {
    let server = TestServer::start().await?;
    let owner_email = unique_email("owner");
    let (platform, owner) = server.create_platform_account(&owner_email).await?;
    let project_id = create_project(&server, &owner).await?;
    let endpoint_id = create_console_endpoint(&server, &owner, &project_id).await?;

    set_failing_since(&server, &endpoint_id, "7 hours").await?;
    let alerted = sweep_failing_webhooks(&server.state).await?;
    assert_eq!(
        alerted,
        SweepReport {
            alerted: 1,
            paused: 0
        }
    );
    let email = server.wait_for_email_text(&owner_email).await?;
    assert!(email.contains("Webhook falhando"), "{email}");
    assert!(email.contains(&format!("/projects/{project_id}/webhooks/{endpoint_id}")));
    let again = sweep_failing_webhooks(&server.state).await?;
    assert_eq!(
        again,
        SweepReport::default(),
        "owners are told once per run of failures"
    );

    set_failing_since(&server, &endpoint_id, "6 days").await?;
    let paused = sweep_failing_webhooks(&server.state).await?;
    assert_eq!(paused.paused, 1);
    let endpoint = console_endpoint(&server, &owner, (&project_id, &endpoint_id)).await?;
    assert_eq!(field(&endpoint, "/is_enabled"), &json!(false));
    assert!(field(&endpoint, "/auto_paused_at").is_string());

    let resume = json!({ "is_enabled": true });
    let path = format!("/auth/v1/admin/webhooks/{endpoint_id}");
    let resumed: Value = as_owner(&server, &owner, (Method::PATCH, &path, &project_id))
        .json(&resume)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&resumed, "/auto_paused_at"), &Value::Null);
    assert_eq!(field(&resumed, "/failing_since"), &Value::Null);

    delete_project(&server, &owner, &project_id).await?;
    server.drop_tenant(&platform).await
}

async fn endpoint_until(
    server: &TestServer,
    tenant: &crate::support::CreatedTenant,
    endpoint_id: &str,
    is_ready: impl Fn(&Value) -> bool,
) -> TestResult<Value> {
    for _ in 0..80 {
        let endpoints: Value = send(webhooks_request(server, tenant, (Method::GET, "")))
            .await?
            .error_for_status()?
            .json()
            .await?;
        let found = endpoints.as_array().and_then(|list| {
            list.iter()
                .find(|endpoint| endpoint.pointer("/id") == Some(&json!(endpoint_id)))
        });

        if let Some(endpoint) = found.filter(|endpoint| is_ready(endpoint)) {
            return Ok(endpoint.clone());
        }

        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    Err("the endpoint never reached the expected health".into())
}

/// Like a receiver that has been refusing for that long, without waiting for it.
async fn set_failing_since(server: &TestServer, endpoint_id: &str, ago: &str) -> TestResult {
    let mut control_plane = server.control_plane().await?;
    sqlx::query("UPDATE webhook_endpoints SET failing_since = now() - $2::interval WHERE id = $1")
        .bind(Uuid::parse_str(endpoint_id)?)
        .bind(ago)
        .execute(&mut control_plane)
        .await?;

    Ok(())
}

fn as_owner(
    server: &TestServer,
    owner: &Session,
    (method, path, project_id): (Method, &str, &str),
) -> reqwest::RequestBuilder {
    server
        .client
        .request(method, server.url(path))
        .bearer_auth(&owner.access_token)
        .header("x-nelcota-project", project_id)
}

async fn create_project(server: &TestServer, owner: &Session) -> TestResult<String> {
    let body = json!({ "slug": random_slug(), "name": "Loja", "site_url": TEST_SITE_URL });
    let created: Value = server
        .client
        .post(server.url("/platform/v1/projects"))
        .bearer_auth(&owner.access_token)
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    text(field(&created, "/tenant_id"))
}

async fn create_console_endpoint(
    server: &TestServer,
    owner: &Session,
    project_id: &str,
) -> TestResult<String> {
    let body = json!({ "url": "https://hooks.example.com/crm", "event_types": ["user.created"] });
    let created: Value = as_owner(
        server,
        owner,
        (Method::POST, "/auth/v1/admin/webhooks", project_id),
    )
    .json(&body)
    .send()
    .await?
    .error_for_status()?
    .json()
    .await?;

    text(field(&created, "/endpoint/id"))
}

async fn console_endpoint(
    server: &TestServer,
    owner: &Session,
    (project_id, endpoint_id): (&str, &str),
) -> TestResult<Value> {
    let endpoints: Value = as_owner(
        server,
        owner,
        (Method::GET, "/auth/v1/admin/webhooks", project_id),
    )
    .send()
    .await?
    .error_for_status()?
    .json()
    .await?;
    let found = endpoints
        .as_array()
        .and_then(|list| {
            list.iter()
                .find(|endpoint| endpoint.pointer("/id") == Some(&json!(endpoint_id)))
        })
        .ok_or("expected the endpoint in the list")?;

    Ok(found.clone())
}

async fn delete_project(
    server: &TestServer,
    owner: &Session,
    project_id: &str,
) -> TestResult<Response> {
    let response = server
        .client
        .delete(server.url(&format!("/platform/v1/projects/{project_id}")))
        .bearer_auth(&owner.access_token)
        .send()
        .await?;

    Ok(response.error_for_status()?)
}
