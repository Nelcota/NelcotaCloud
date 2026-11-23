use reqwest::{Method, StatusCode};
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};
use crate::webhooks::receiver::{
    WebhookReceiver, body_json, create_endpoint, send, text, webhooks_request,
};

#[tokio::test]
async fn records_latency_and_the_start_of_a_refusal() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering_with_body(500, "signature mismatch").await;
    let (endpoint_id, _) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    server.sign_up(&tenant, &unique_email("refused")).await?;
    receiver.wait_for(1).await?;

    let log = log_until(&server, &tenant, (&endpoint_id, "/0/attempts", &json!(1))).await?;
    assert_eq!(field(&log, "/0/last_response_status"), &json!(500));
    assert_eq!(
        field(&log, "/0/last_response_body"),
        &json!("signature mismatch")
    );
    assert!(field(&log, "/0/last_duration_ms").is_i64());

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn filters_and_pages_the_log() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    let (endpoint_id, _) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;

    for name in ["first", "second", "third"] {
        server.sign_up(&tenant, &unique_email(name)).await?;
    }

    receiver.wait_for(3).await?;
    let delivered = log_until(
        &server,
        &tenant,
        (&endpoint_id, "/2/status", &json!("delivered")),
    )
    .await?;
    let second_id = text(field(&delivered, "/1/id"))?;

    let first_page = log_page(&server, &tenant, (&endpoint_id, "?limit=2")).await?;
    assert_eq!(first_page.as_array().map(Vec::len), Some(2));
    let rest = log_page(
        &server,
        &tenant,
        (&endpoint_id, &format!("?before={second_id}")),
    )
    .await?;
    assert_eq!(rest.as_array().map(Vec::len), Some(1));
    assert_eq!(field(&rest, "/0/id"), field(&delivered, "/2/id"));

    let failed = log_page(&server, &tenant, (&endpoint_id, "?status=failed")).await?;
    assert_eq!(failed, json!([]));
    let accepted = log_page(&server, &tenant, (&endpoint_id, "?status=delivered")).await?;
    assert_eq!(accepted.as_array().map(Vec::len), Some(3));

    for bad in ["?status=lost", "?limit=0", "?limit=101", "?before=nope"] {
        let suffix = format!("/{endpoint_id}/deliveries{bad}");
        let response = send(webhooks_request(&server, &tenant, (Method::GET, &suffix))).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{bad}");
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn sends_every_failed_delivery_again_at_once() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    let (endpoint_id, _) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    server.sign_up(&tenant, &unique_email("lost-one")).await?;
    server.sign_up(&tenant, &unique_email("lost-two")).await?;
    receiver.wait_for(2).await?;
    log_until(
        &server,
        &tenant,
        (&endpoint_id, "/1/status", &json!("delivered")),
    )
    .await?;
    give_up_every_delivery(&server, &tenant).await?;

    let suffix = format!("/{endpoint_id}/deliveries/retry-failed");
    let retried: Value = send(webhooks_request(&server, &tenant, (Method::POST, &suffix)))
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(retried, json!({ "queued": 2 }));
    receiver.wait_for(4).await?;

    let disable = json!({ "is_enabled": false });
    let path = format!("/{endpoint_id}");
    send(webhooks_request(&server, &tenant, (Method::PATCH, &path)).json(&disable))
        .await?
        .error_for_status()?;
    let refused = send(webhooks_request(&server, &tenant, (Method::POST, &suffix))).await?;
    assert_eq!(refused.status(), StatusCode::CONFLICT);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn a_test_event_imitates_the_chosen_type() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(200).await;
    let (endpoint_id, _) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.banned"])).await?;
    let suffix = format!("/{endpoint_id}/test");

    let chosen = json!({ "event_type": "user.banned" });
    let result: Value =
        send(webhooks_request(&server, &tenant, (Method::POST, &suffix)).json(&chosen))
            .await?
            .error_for_status()?
            .json()
            .await?;
    assert_eq!(field(&result, "/delivered"), &json!(true));
    assert!(field(&result, "/duration_ms").is_i64());
    let requests = receiver.wait_for(1).await?;
    let body = body_json(requests.first().ok_or("expected the test event")?)?;
    assert_eq!(field(&body, "/type"), &json!("user.banned"));
    assert!(field(&body, "/data/user/banned_at").is_string());

    let plain = send(webhooks_request(&server, &tenant, (Method::POST, &suffix))).await?;
    assert_eq!(plain.status(), StatusCode::OK);
    let requests = receiver.wait_for(2).await?;
    let body = body_json(requests.last().ok_or("expected the plain test event")?)?;
    assert_eq!(field(&body, "/type"), &json!("webhook.test"));

    let unknown = json!({ "event_type": "user.vanished" });
    let refused =
        send(webhooks_request(&server, &tenant, (Method::POST, &suffix)).json(&unknown)).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);

    server.drop_tenant(&tenant).await
}

async fn log_page(
    server: &TestServer,
    tenant: &CreatedTenant,
    (endpoint_id, query): (&str, &str),
) -> TestResult<Value> {
    let suffix = format!("/{endpoint_id}/deliveries{query}");
    let response = send(webhooks_request(server, tenant, (Method::GET, &suffix))).await?;

    Ok(response.error_for_status()?.json().await?)
}

/// The receiver answers before the worker commits the attempt: waits until the log shows it.
async fn log_until(
    server: &TestServer,
    tenant: &CreatedTenant,
    (endpoint_id, pointer, expected): (&str, &str, &Value),
) -> TestResult<Value> {
    for _ in 0..80 {
        let log = log_page(server, tenant, (endpoint_id, "")).await?;

        if log.pointer(pointer) == Some(expected) {
            return Ok(log);
        }

        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    Err(format!("the log never showed {pointer} = {expected}").into())
}

/// Like deliveries whose every retry failed, without waiting the 28 hours.
async fn give_up_every_delivery(server: &TestServer, tenant: &CreatedTenant) -> TestResult {
    let pool = server.tenant_fixture_pool(tenant).await?;
    sqlx::query(
        "UPDATE webhook_deliveries SET delivered_at = NULL, failed_at = now(), last_error = 'fixture'",
    )
    .execute(&pool)
    .await?;
    pool.close().await;

    Ok(())
}
