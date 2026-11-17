use std::time::Duration;

use reqwest::{Method, StatusCode};

use crate::support::{TestResult, TestServer, unique_email};
use crate::webhook_receiver::{WebhookReceiver, create_endpoint, send, webhooks_request};

const POLL_ATTEMPTS: u32 = 100;
const POLL_INTERVAL: Duration = Duration::from_millis(100);
/// Longer than the first retry (about 5 seconds), so a retry would have arrived by then.
const AFTER_FIRST_RETRY: Duration = Duration::from_secs(8);
const MANUAL_SENDS_BURST: usize = 10;

#[tokio::test]
async fn deleting_an_endpoint_gives_up_its_pending_deliveries() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(500).await;
    let (id, _) = create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    server.sign_up(&tenant, &unique_email("orphan")).await?;
    receiver.wait_for(1).await?;

    let deleted = send(webhooks_request(
        &server,
        &tenant,
        (Method::DELETE, &format!("/{id}")),
    ))
    .await?;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);

    let mut tenant_database = server.tenant_database(&tenant).await?;
    let mut last_error: Option<String> = None;

    for _ in 0..POLL_ATTEMPTS {
        last_error = sqlx::query_scalar(
            "SELECT last_error FROM webhook_deliveries WHERE failed_at IS NOT NULL LIMIT 1",
        )
        .fetch_optional(&mut tenant_database)
        .await?
        .flatten();

        if last_error.is_some() {
            break;
        }

        tokio::time::sleep(POLL_INTERVAL).await;
    }

    assert_eq!(
        last_error.as_deref(),
        Some("the endpoint was deleted or disabled")
    );
    tokio::time::sleep(AFTER_FIRST_RETRY).await;
    assert_eq!(
        receiver.received_count().await,
        1,
        "no retry after the deletion"
    );

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn limits_test_events_per_project() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    let (id, _) = create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    let test_path = format!("/{id}/test");

    for _ in 0..MANUAL_SENDS_BURST {
        let response = send(webhooks_request(
            &server,
            &tenant,
            (Method::POST, &test_path),
        ))
        .await?;
        assert_eq!(response.status(), StatusCode::OK);
    }

    let limited = send(webhooks_request(
        &server,
        &tenant,
        (Method::POST, &test_path),
    ))
    .await?;
    assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(receiver.received_count().await, MANUAL_SENDS_BURST);

    server.drop_tenant(&tenant).await
}
