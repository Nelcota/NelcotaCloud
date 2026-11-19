use std::time::Duration;

use reqwest::StatusCode;
use serde_json::{Value, json};
use uuid::Uuid;
use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, Request, ResponseTemplate};

use super::{BUCKETS, create_bucket, is_queued, mock_storage, text_field};
use crate::support::{TestResult, TestServer, unique_email};

#[tokio::test]
async fn bounds_concurrent_pending_reservations_and_erases_user_owned_files() -> TestResult {
    let provider = mock_storage().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let tenant = server.create_tenant().await?;
    let owner = server
        .sign_up(&tenant, &unique_email("bounded-owner"))
        .await?;
    let bucket = create_bucket(&server, &tenant).await?;
    let path = format!("{BUCKETS}/{bucket}/uploads");
    let reserve = || {
        server
            .client
            .post(server.url(&path))
            .header("apikey", &tenant.publishable_key)
            .bearer_auth(&owner.access_token)
            .json(&json!({"name": "note.txt", "content_type": "text/plain", "size_bytes": 3}))
            .send()
    };
    let (a, b, c, d, e) = tokio::join!(reserve(), reserve(), reserve(), reserve(), reserve());
    let mut accepted = Vec::new();
    let mut limited = 0_usize;

    for result in [a?, b?, c?, d?, e?] {
        match result.status() {
            StatusCode::CREATED => accepted.push(result.json::<Value>().await?),
            StatusCode::TOO_MANY_REQUESTS => limited = limited.saturating_add(1),
            status => return Err(format!("unexpected reservation status {status}").into()),
        }
    }

    assert_eq!(accepted.len(), 4);
    assert_eq!(limited, 1);
    let deleted = server
        .client
        .delete(server.url("/auth/v1/user"))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&owner.access_token)
        .send()
        .await?;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);

    for pending in accepted {
        let id = Uuid::parse_str(text_field(&pending, "/object_id")?)?;
        assert!(is_queued(&server, id).await?);
        let response = server
            .client
            .post(server.url(&format!("/storage/v1/objects/{id}/complete")))
            .header("apikey", &tenant.secret_key)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn reports_missing_provider_credentials_without_breaking_api_readiness() -> TestResult {
    let provider = MockServer::start().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let health = server
        .client
        .get(server.url("/ops/storage/health"))
        .send()
        .await?;
    let ready = server.client.get(server.url("/ready")).send().await?;

    assert_eq!(health.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(ready.status(), StatusCode::OK);

    Ok(())
}

#[tokio::test]
async fn deletion_batch_keeps_failed_and_differently_bound_objects() -> TestResult {
    let provider = mock_storage().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let tenant = server.create_tenant().await?;
    let bucket = Uuid::parse_str(&create_bucket(&server, &tenant).await?)?;
    let mut control = server.control_plane().await?;
    let tenant_id: Uuid = sqlx::query_scalar("SELECT tenant_id FROM storage_buckets WHERE id = $1")
        .bind(bucket)
        .fetch_one(&mut control)
        .await?;
    let removed = Uuid::new_v4();
    let failed = Uuid::new_v4();
    let other = Uuid::new_v4();
    let location = format!("{}/test-files", provider.uri());

    Mock::given(method("POST")).and(path_regex("^/test-files/?$")).respond_with(move |request: &Request| {
        let body = String::from_utf8_lossy(&request.body);
        assert!(body.contains(&failed.to_string()));
        assert!(body.contains(&removed.to_string()));
        assert!(body.contains(&other.to_string()) == false);

        ResponseTemplate::new(200).set_body_raw(
            format!("<DeleteResult><Deleted><Key>projects/{tenant_id}/buckets/{bucket}/{removed}</Key></Deleted><Error><Key>projects/{tenant_id}/buckets/{bucket}/{failed}</Key><Code>AccessDenied</Code></Error></DeleteResult>"),
            "application/xml",
        )
    }).expect(1).mount(&provider).await;

    sqlx::query(
        "INSERT INTO storage_object_deletions (id, tenant_id, bucket_id, size_bytes, next_attempt_at, location)
         VALUES ($1, $4, $5, 3, now(), $6), ($2, $4, $5, 3, now(), $6),
                ($3, $4, $5, 3, now(), 'https://other.invalid/test-files')",
    ).bind(removed).bind(failed).bind(other).bind(tenant_id).bind(bucket).bind(location).execute(&mut control).await?;
    tokio::time::timeout(Duration::from_secs(20), async {
        while is_queued(&server, removed).await? {
            tokio::time::sleep(Duration::from_millis(250)).await;
        }

        Ok::<(), Box<dyn std::error::Error>>(())
    })
    .await??;
    assert!(is_queued(&server, failed).await?);
    assert!(is_queued(&server, other).await?);

    server.drop_tenant(&tenant).await
}
