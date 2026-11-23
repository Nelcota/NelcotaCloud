use reqwest::{Method, StatusCode};
use serde_json::{Value, json};

use super::receiver::{
    WebhookReceiver, body_json, create_endpoint, has_valid_signature, header, send, text,
    webhooks_request,
};
use crate::support::{TestResult, TestServer, field, unique_email};

#[tokio::test]
async fn a_metadata_update_and_its_webhook_commit_together() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    create_endpoint(&server, &tenant, (&receiver.url(), &["user.updated"])).await?;
    let session = server
        .sign_up(&tenant, &unique_email("webhook-metadata"))
        .await?;
    let request = server
        .client
        .patch(server.url("/auth/v1/user"))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&session.access_token);
    let first_request = request
        .try_clone()
        .ok_or("could not clone the metadata request")?;
    let metadata = json!({ "theme": "dark" });
    let updated: Value = first_request
        .json(&json!({ "user_metadata": metadata }))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    let requests = receiver.wait_for(1).await?;
    let event = body_json(requests.first().ok_or("no webhook request")?)?;
    assert_eq!(field(&event, "/type"), "user.updated");
    let mut webhook_user = updated
        .as_object()
        .cloned()
        .ok_or("expected a user object")?;
    for http_field in ["last_sign_in_at", "has_password", "providers"] {
        assert!(webhook_user.remove(http_field).is_some());
    }

    assert_eq!(field(&event, "/data/user"), &Value::Object(webhook_user));

    let mut database = server.tenant_database(&tenant).await?;
    sqlx::query("ALTER TABLE webhook_events ADD CHECK (event_type <> 'user.updated') NOT VALID")
        .execute(&mut database)
        .await?;
    let refused = request
        .json(&json!({ "user_metadata": { "theme": "light" } }))
        .send()
        .await?;
    assert_eq!(refused.status(), StatusCode::INTERNAL_SERVER_ERROR);
    let user: Value = server
        .current_user(&tenant.publishable_key, &session.access_token)
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&user, "/user_metadata"), &metadata);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn delivers_signed_user_created_events() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    let (_, secret) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    let email = unique_email("webhook");
    let session = server.sign_up(&tenant, &email).await?;

    let requests = receiver.wait_for(1).await?;
    let request = requests.first().ok_or("no webhook request")?;
    let body = body_json(request)?;
    assert_eq!(field(&body, "/type"), &json!("user.created"));
    assert_eq!(field(&body, "/data/user/email"), &json!(email));
    assert_eq!(field(&body, "/data/user/id"), &json!(session.user.id));
    assert!(field(&body, "/timestamp").is_string());
    assert!(has_valid_signature(request, &secret)?);
    assert_eq!(header(request, "content-type")?, "application/json");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn sends_only_the_events_an_endpoint_subscribed_to() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(200).await;
    create_endpoint(&server, &tenant, (&receiver.url(), &["user.banned"])).await?;
    let session = server.sign_up(&tenant, &unique_email("banned")).await?;
    let user_id = session.user.id;

    let ban = server
        .client
        .post(server.url(&format!("/auth/v1/admin/users/{user_id}/ban")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(ban.status(), StatusCode::OK);

    let requests = receiver.wait_for(1).await?;
    assert_eq!(requests.len(), 1, "user.created must not be sent");
    let request = requests.first().ok_or("no webhook request")?;
    let body = body_json(request)?;
    assert_eq!(field(&body, "/type"), &json!("user.banned"));
    assert!(field(&body, "/data/user/banned_at").is_string());

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn endpoint_updates_apply_to_events_written_by_another_api_instance() -> TestResult {
    let management = TestServer::start().await?;
    let writer = TestServer::start().await?;
    let tenant = management.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    writer
        .sign_up(&tenant, &unique_email("before-webhook"))
        .await?;
    let (id, _) =
        create_endpoint(&management, &tenant, (&receiver.url(), &["user.created"])).await?;

    writer
        .sign_up(&tenant, &unique_email("with-webhook"))
        .await?;
    let before = delivery_log(&management, &tenant, &id).await?;
    assert_eq!(before.as_array().map(Vec::len), Some(1));

    webhooks_request(&management, &tenant, (Method::PATCH, &format!("/{id}")))
        .json(&json!({ "event_types": ["user.deleted"] }))
        .send()
        .await?
        .error_for_status()?;
    writer
        .sign_up(&tenant, &unique_email("after-webhook-change"))
        .await?;
    // A worker in another test may already have attempted the existing delivery.
    let after = delivery_log(&management, &tenant, &id).await?;
    assert_eq!(after.as_array().map(Vec::len), Some(1));
    assert_eq!(
        text(field(&after, "/0/id"))?,
        text(field(&before, "/0/id"))?
    );
    assert_eq!(
        text(field(&after, "/0/event_id"))?,
        text(field(&before, "/0/event_id"))?
    );

    management.drop_tenant(&tenant).await
}

#[tokio::test]
async fn retries_a_failed_delivery_with_the_same_id() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::failing_once().await;
    let (endpoint_id, _) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    server.sign_up(&tenant, &unique_email("retry")).await?;

    // The first retry comes about 5 seconds after the failure.
    let requests = receiver.wait_for(2).await?;
    let ids: Vec<&str> = requests
        .iter()
        .map(|request| header(request, "webhook-id"))
        .collect::<TestResult<_>>()?;
    assert_eq!(
        ids.first(),
        ids.last(),
        "receivers deduplicate by webhook-id"
    );

    let log = delivered_log(&server, &tenant, &endpoint_id).await?;
    assert_eq!(field(&log, "/0/status"), &json!("delivered"));
    assert_eq!(field(&log, "/0/attempts"), &json!(2));
    assert_eq!(field(&log, "/0/last_response_status"), &json!(204));
    assert_eq!(field(&log, "/0/event_type"), &json!("user.created"));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn an_owner_can_send_a_delivery_again() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(200).await;
    let (endpoint_id, _) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    server.sign_up(&tenant, &unique_email("resend")).await?;
    receiver.wait_for(1).await?;
    let log = delivered_log(&server, &tenant, &endpoint_id).await?;
    let delivery_id = text(field(&log, "/0/id"))?;

    let suffix = format!("/{endpoint_id}/deliveries/{delivery_id}/retry");
    let retried = send(webhooks_request(&server, &tenant, (Method::POST, &suffix))).await?;
    assert_eq!(retried.status(), StatusCode::ACCEPTED);
    receiver.wait_for(2).await?;

    let unknown = format!("/{endpoint_id}/deliveries/{endpoint_id}/retry");
    let missing = send(webhooks_request(&server, &tenant, (Method::POST, &unknown))).await?;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn reports_ended_sessions_and_deleted_users() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(200).await;
    let events = ["session.revoked", "user.deleted"];
    create_endpoint(&server, &tenant, (&receiver.url(), &events)).await?;
    let session = server.sign_up(&tenant, &unique_email("leaving")).await?;
    let user_path = format!("/auth/v1/admin/users/{}", session.user.id);

    for (method, path) in [
        (Method::POST, format!("{user_path}/logout")),
        (Method::DELETE, user_path.clone()),
    ] {
        let response = server
            .client
            .request(method, server.url(&path))
            .header("apikey", &tenant.secret_key)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::NO_CONTENT, "{path}");
    }

    let requests = receiver.wait_for(2).await?;
    let mut types: Vec<Value> = requests
        .iter()
        .map(|request| body_json(request).map(|body| field(&body, "/type").clone()))
        .collect::<TestResult<_>>()?;
    types.sort_by_key(ToString::to_string);
    assert_eq!(types, vec![json!("session.revoked"), json!("user.deleted")]);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn disabled_endpoints_receive_nothing() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(200).await;
    let (id, _) = create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    let disable = json!({ "is_enabled": false });
    send(webhooks_request(&server, &tenant, (Method::PATCH, &format!("/{id}"))).json(&disable))
        .await?
        .error_for_status()?;
    server.sign_up(&tenant, &unique_email("quiet")).await?;

    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    assert_eq!(receiver.received_count().await, 0);
    let log = delivery_log(&server, &tenant, &id).await?;
    assert_eq!(log, json!([]));

    server.drop_tenant(&tenant).await
}

async fn delivery_log(
    server: &TestServer,
    tenant: &crate::support::CreatedTenant,
    endpoint_id: &str,
) -> TestResult<Value> {
    let suffix = format!("/{endpoint_id}/deliveries");
    let response = send(webhooks_request(server, tenant, (Method::GET, &suffix))).await?;

    Ok(response.error_for_status()?.json().await?)
}

/// The receiver answers before the worker commits the attempt: waits until the log shows it.
async fn delivered_log(
    server: &TestServer,
    tenant: &crate::support::CreatedTenant,
    endpoint_id: &str,
) -> TestResult<Value> {
    for _ in 0..50 {
        let log = delivery_log(server, tenant, endpoint_id).await?;

        if log.pointer("/0/status") == Some(&json!("delivered")) {
            return Ok(log);
        }

        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    Err("the delivery was never recorded as delivered".into())
}
