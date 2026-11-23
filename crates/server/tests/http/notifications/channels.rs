use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};
use server::modules::notifications::alerts::alert_sweep::sweep_alerts;

use crate::support::{CreatedTenant, TestResult, TestServer, error_code, field, unique_email};

const SLACK_HOOK: &str = "https://hooks.slack.com/services/T000/B000/abcdKEY9";

async fn admin(
    server: &TestServer,
    tenant: &CreatedTenant,
    request: (Method, &str, Option<Value>),
) -> TestResult<Response> {
    let (method, path, body) = request;
    let mut builder = server
        .client
        .request(method, server.url(path))
        .header("apikey", &tenant.secret_key);

    if let Some(body) = body {
        builder = builder.json(&body);
    }

    Ok(builder.send().await?)
}

async fn add_channel(
    server: &TestServer,
    tenant: &CreatedTenant,
    (kind, target): (&str, &str),
    events: Value,
) -> TestResult<Response> {
    let body = json!({ "kind": kind, "target": target, "events": events });

    admin(
        server,
        tenant,
        (Method::POST, "/auth/v1/admin/notifications", Some(body)),
    )
    .await
}

#[tokio::test]
async fn channels_are_added_listed_changed_and_removed() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let created = add_channel(
        &server,
        &tenant,
        ("slack", SLACK_HOOK),
        json!(["data_api_errors", "data_api_errors", "webhook_failing"]),
    )
    .await?;
    assert_eq!(created.status(), StatusCode::CREATED);
    let channel: Value = created.json().await?;
    assert_eq!(field(&channel, "/target_hint"), "hooks.slack.com/…KEY9");
    assert_eq!(
        field(&channel, "/events"),
        &json!(["webhook_failing", "data_api_errors"])
    );
    let channel_id = field(&channel, "/id")
        .as_str()
        .unwrap_or_default()
        .to_owned();
    let listed: Value = admin(
        &server,
        &tenant,
        (Method::GET, "/auth/v1/admin/notifications", None),
    )
    .await?
    .error_for_status()?
    .json()
    .await?;
    assert_eq!(field(&listed, "/channels/0/id"), &json!(channel_id));
    assert!(listed.to_string().contains("abcdKEY9") == false);

    let path = format!("/auth/v1/admin/notifications/{channel_id}");
    let changed: Value = admin(
        &server,
        &tenant,
        (
            Method::PATCH,
            &path,
            Some(json!({ "events": ["storage_near_limit"] })),
        ),
    )
    .await?
    .error_for_status()?
    .json()
    .await?;
    assert_eq!(field(&changed, "/events"), &json!(["storage_near_limit"]));
    let removed = admin(&server, &tenant, (Method::DELETE, &path, None)).await?;
    assert_eq!(removed.status(), StatusCode::NO_CONTENT);
    let again = admin(&server, &tenant, (Method::DELETE, &path, None)).await?;
    assert_eq!(again.status(), StatusCode::NOT_FOUND);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn channels_refuse_foreign_urls_and_stop_at_five() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let events = json!(["login_failures"]);

    for refused in [
        ("discord", "https://example.com/api/webhooks/1/a"),
        ("slack", "http://hooks.slack.com/services/T/B/x"),
        ("email", "nobody"),
    ] {
        let response = add_channel(&server, &tenant, refused, events.clone()).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{refused:?}");
    }

    for _ in 0..5 {
        add_channel(
            &server,
            &tenant,
            ("email", &unique_email("ops")),
            events.clone(),
        )
        .await?
        .error_for_status()?;
    }
    let sixth = add_channel(&server, &tenant, ("email", "late@example.com"), events).await?;
    assert_eq!(sixth.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(sixth).await?, "notification_channel_limit");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn test_alerts_and_data_api_spikes_reach_email_channels() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, _) = server
        .create_platform_account(&unique_email("console"))
        .await?;
    let tenant = server.create_tenant().await?;
    let recipient = unique_email("alerts");
    let channel: Value = add_channel(
        &server,
        &tenant,
        ("email", &recipient),
        json!(["data_api_errors"]),
    )
    .await?
    .error_for_status()?
    .json()
    .await?;
    let channel_id = field(&channel, "/id")
        .as_str()
        .unwrap_or_default()
        .to_owned();

    let test_path = format!("/auth/v1/admin/notifications/{channel_id}/test");
    let tested = admin(&server, &tenant, (Method::POST, &test_path, None)).await?;
    assert_eq!(tested.status(), StatusCode::NO_CONTENT);
    let text = server.wait_for_email_text(&recipient).await?;
    assert!(text.contains("Canal funcionando"));

    sqlx::query(
        "INSERT INTO data_api_usage \
             (tenant_id, hour_start, resource, method, status, requests, duration_milliseconds) \
         VALUES ($1, date_trunc('hour', now()), 'orders', 'GET', 500, 30, 300), \
                ($1, date_trunc('hour', now()), 'orders', 'GET', 200, 70, 700)",
    )
    .bind(tenant.tenant_id)
    .execute(&server.state.control_plane_pool)
    .await?;
    assert_eq!(sweep_alerts(&server.state).await?, 1);
    assert_eq!(sweep_alerts(&server.state).await?, 0);

    server.drop_tenant(&tenant).await?;
    server.drop_tenant(&platform).await
}
