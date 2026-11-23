use reqwest::{Method, StatusCode};
use serde_json::{Value, json};
use uuid::Uuid;

use super::receiver::{
    WebhookReceiver, create_endpoint, has_valid_signature, send, text, webhooks_request,
};
use crate::support::{TestResult, TestServer, error_code, field, unique_email};

#[tokio::test]
async fn manages_endpoints_and_shows_the_secret_only_once() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let endpoint = ("https://hooks.example.com/a", &["user.created"][..]);
    let (id, secret) = create_endpoint(&server, &tenant, endpoint).await?;

    assert!(secret.starts_with("whsec_"));
    let listed: Value = send(webhooks_request(&server, &tenant, (Method::GET, "")))
        .await?
        .json()
        .await?;
    assert_eq!(field(&listed, "/0/id"), &json!(id));
    assert_eq!(field(&listed, "/0/is_enabled"), &json!(true));
    assert_eq!(field(&listed, "/0/secret"), &Value::Null);

    let changes = json!({ "event_types": ["user.deleted", "user.created"], "is_enabled": false });
    let changed: Value =
        send(webhooks_request(&server, &tenant, (Method::PATCH, &format!("/{id}"))).json(&changes))
            .await?
            .json()
            .await?;
    assert_eq!(field(&changed, "/is_enabled"), &json!(false));
    assert_eq!(
        field(&changed, "/event_types"),
        &json!(["user.created", "user.deleted"])
    );

    let deleted = send(webhooks_request(
        &server,
        &tenant,
        (Method::DELETE, &format!("/{id}")),
    ))
    .await?;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
    let again = send(webhooks_request(
        &server,
        &tenant,
        (Method::DELETE, &format!("/{id}")),
    ))
    .await?;
    assert_eq!(again.status(), StatusCode::NOT_FOUND);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_invalid_endpoints() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    for body in [
        json!({ "url": "not a url", "event_types": ["user.created"] }),
        json!({ "url": "https://hooks.example.com", "event_types": [] }),
        json!({ "url": "https://user:pass@hooks.example.com", "event_types": ["user.created"] }),
    ] {
        let response =
            send(webhooks_request(&server, &tenant, (Method::POST, "")).json(&body)).await?;

        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{body}");
    }

    let unknown = json!({ "url": "https://hooks.example.com", "event_types": ["user.exploded"] });
    let response =
        send(webhooks_request(&server, &tenant, (Method::POST, "")).json(&unknown)).await?;
    assert!(response.status().is_client_error());

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn limits_endpoints_per_project() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    for index in 0..5 {
        let url = format!("https://hooks.example.com/{index}");
        create_endpoint(&server, &tenant, (&url, &["user.created"])).await?;
    }

    let body = json!({ "url": "https://hooks.example.com/6", "event_types": ["user.created"] });
    let response = send(webhooks_request(&server, &tenant, (Method::POST, "")).json(&body)).await?;
    assert_eq!(response.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(response).await?, "webhook_endpoint_limit");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn endpoints_of_another_project_are_not_found() -> TestResult {
    let server = TestServer::start().await?;
    let owner = server.create_tenant().await?;
    let other = server.create_tenant().await?;
    let (id, _) = create_endpoint(
        &server,
        &owner,
        ("https://hooks.example.com", &["user.created"]),
    )
    .await?;

    for (method, suffix) in [
        (Method::DELETE, format!("/{id}")),
        (Method::POST, format!("/{id}/secret")),
        (Method::POST, format!("/{id}/test")),
        (Method::GET, format!("/{id}/deliveries")),
    ] {
        let response = send(webhooks_request(&server, &other, (method, &suffix))).await?;

        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{suffix}");
    }

    let publishable = server
        .client
        .get(server.url("/auth/v1/admin/webhooks"))
        .header("apikey", &owner.publishable_key)
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);

    server.drop_tenant(&owner).await?;
    server.drop_tenant(&other).await
}

#[tokio::test]
async fn test_event_reports_the_answer_and_rotation_signs_with_both_secrets() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(200).await;
    let (id, old_secret) =
        create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;
    let rotated: Value = send(webhooks_request(
        &server,
        &tenant,
        (Method::POST, &format!("/{id}/secret")),
    ))
    .await?
    .error_for_status()?
    .json()
    .await?;
    let new_secret = text(field(&rotated, "/secret"))?;

    let result: Value = send(webhooks_request(
        &server,
        &tenant,
        (Method::POST, &format!("/{id}/test")),
    ))
    .await?
    .json()
    .await?;
    assert_eq!(field(&result, "/delivered"), &json!(true));
    assert_eq!(field(&result, "/response_status"), &json!(200));

    let requests = receiver.wait_for(1).await?;
    let request = requests.first().ok_or("no test request")?;
    assert!(has_valid_signature(request, &old_secret)?);
    assert!(has_valid_signature(request, &new_secret)?);

    let failing = WebhookReceiver::answering(503).await;
    let (failing_id, _) =
        create_endpoint(&server, &tenant, (&failing.url(), &["user.created"])).await?;
    let failed: Value = send(webhooks_request(
        &server,
        &tenant,
        (Method::POST, &format!("/{failing_id}/test")),
    ))
    .await?
    .json()
    .await?;
    assert_eq!(field(&failed, "/delivered"), &json!(false));
    assert_eq!(field(&failed, "/response_status"), &json!(503));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rotation_restores_delivery_when_the_previous_secret_is_unreadable() -> TestResult {
    let mut server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let receiver = WebhookReceiver::answering(204).await;
    let (id, _) = create_endpoint(&server, &tenant, (&receiver.url(), &["user.created"])).await?;

    let mut database = server.control_plane().await?;
    sqlx::query("UPDATE webhook_endpoints SET secret_ciphertext = $2 WHERE id = $1")
        .bind(Uuid::parse_str(&id)?)
        .bind([0_u8; 32].as_slice())
        .execute(&mut database)
        .await?;
    drop(database);

    let rotated: Value =
        webhooks_request(&server, &tenant, (Method::POST, &format!("/{id}/secret")))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
    let secret = text(field(&rotated, "/secret"))?;
    let result: Value = webhooks_request(&server, &tenant, (Method::POST, &format!("/{id}/test")))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&result, "/delivered"), &json!(true));

    server.start_worker().await?;
    server
        .sign_up(&tenant, &unique_email("rotated-webhook"))
        .await?;
    let requests = receiver.wait_for(2).await?;
    assert_eq!(requests.len(), 2);

    for request in &requests {
        assert!(has_valid_signature(request, &secret)?);
    }

    server.drop_tenant(&tenant).await
}
