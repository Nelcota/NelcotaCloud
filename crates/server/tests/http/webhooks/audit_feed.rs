use serde_json::json;
use sqlx::Connection;

use super::receiver::{WebhookReceiver, body_json, create_endpoint, has_valid_signature};
use crate::support::{TestResult, TestServer, field, unique_email};

#[tokio::test]
async fn sends_an_event_that_commits_after_a_higher_id() -> TestResult {
    let mut server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    create_endpoint(&server, &tenant, (&receiver.url(), &["audit.event"])).await?;
    let mut first_connection = server.tenant_database(&tenant).await?;
    let mut second_connection = server.tenant_database(&tenant).await?;
    let mut first_write = first_connection.begin().await?;
    let insert =
        "INSERT INTO auth.audit_events (action, actor) VALUES ('logged_in', 'user') RETURNING id";
    let first_id: i64 = sqlx::query_scalar(insert)
        .fetch_one(&mut *first_write)
        .await?;
    let second_id: i64 = sqlx::query_scalar(insert)
        .fetch_one(&mut second_connection)
        .await?;
    assert!(first_id < second_id);
    server.start_worker().await?;

    let requests = receiver.wait_for(1).await?;
    let first_delivery = body_json(requests.first().ok_or("missing first delivery")?)?;
    assert_eq!(field(&first_delivery, "/data/event/id"), &json!(second_id));
    first_write.commit().await?;

    let requests = receiver.wait_for(2).await?;
    let second_delivery = body_json(requests.get(1).ok_or("missing second delivery")?)?;
    assert_eq!(field(&second_delivery, "/data/event/id"), &json!(first_id));
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn sends_new_activity_events_to_audit_subscribers() -> TestResult {
    let server = TestServer::start_with_worker().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    let (_, secret) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["audit.event"])).await?;
    let email = unique_email("audit-feed");
    let session = server.sign_up(&tenant, &email).await?;

    let requests = receiver.wait_for(1).await?;
    let request = requests.first().ok_or("no webhook request")?;
    let body = body_json(request)?;
    assert_eq!(field(&body, "/type"), "audit.event");
    assert_eq!(field(&body, "/data/event/action"), "signed_up");
    assert_eq!(field(&body, "/data/event/user_id"), &json!(session.user.id));
    assert_eq!(field(&body, "/data/event/email"), &json!(email));
    assert_eq!(field(&body, "/data/event/ip_address"), "127.0.0.1");
    assert!(has_valid_signature(request, &secret)?);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn a_batch_delivers_each_activity_to_every_subscriber() -> TestResult {
    let mut server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let first = WebhookReceiver::answering(204).await;
    let second = WebhookReceiver::answering(204).await;
    let (_, first_secret) =
        create_endpoint(&server, &tenant, (&first.url(), &["audit.event"])).await?;
    let (_, second_secret) =
        create_endpoint(&server, &tenant, (&second.url(), &["audit.event"])).await?;
    let mut connection = server.tenant_database(&tenant).await?;
    let ids: Vec<i64> = sqlx::query_scalar(
        "INSERT INTO auth.audit_events (action, actor) \
         SELECT 'logged_in', 'user' FROM generate_series(1, 3) RETURNING id",
    )
    .fetch_all(&mut connection)
    .await?;
    drop(connection);
    server.start_worker().await?;

    for (receiver, secret) in [(&first, first_secret), (&second, second_secret)] {
        let requests = receiver.wait_for(ids.len()).await?;
        let mut delivered = Vec::new();
        for request in requests {
            assert!(has_valid_signature(&request, &secret)?);
            let body = body_json(&request)?;
            let id = field(&body, "/data/event/id")
                .as_i64()
                .ok_or("missing event id")?;
            delivered.push(id);
        }

        delivered.sort_unstable();
        assert_eq!(delivered, ids);
    }

    server.drop_tenant(&tenant).await
}
