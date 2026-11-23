use std::time::Duration;

use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use hmac::{Hmac, KeyInit, Mac};
use reqwest::{Method, Response};
use serde_json::{Value, json};
use sha2::Sha256;
use wiremock::matchers::method;
use wiremock::{Mock, MockServer, Request, ResponseTemplate};

use crate::support::{CreatedTenant, TestResult, TestServer, field};

const WAIT_ATTEMPTS: u32 = 150;
const WAIT_INTERVAL: Duration = Duration::from_millis(100);

/// A fake receiver of the tenant's webhooks.
pub struct WebhookReceiver {
    pub server: MockServer,
}

impl WebhookReceiver {
    /// Answers every request with `status`.
    pub async fn answering(status: u16) -> Self {
        Self::answering_after(status, Duration::ZERO).await
    }

    pub async fn answering_after(status: u16, delay: Duration) -> Self {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .respond_with(ResponseTemplate::new(status).set_delay(delay))
            .mount(&server)
            .await;

        Self { server }
    }

    /// Answers every request with `status` and a plain-text `body`.
    pub async fn answering_with_body(status: u16, body: &str) -> Self {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .respond_with(ResponseTemplate::new(status).set_body_string(body))
            .mount(&server)
            .await;

        Self { server }
    }

    /// Fails the first request with a 500, then accepts.
    pub async fn failing_once() -> Self {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .respond_with(ResponseTemplate::new(500))
            .up_to_n_times(1)
            .with_priority(1)
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .respond_with(ResponseTemplate::new(204))
            .with_priority(2)
            .mount(&server)
            .await;

        Self { server }
    }

    pub fn url(&self) -> String {
        format!("{}/hooks", self.server.uri())
    }

    /// Waits until at least `count` requests arrived, and returns all of them.
    pub async fn wait_for(&self, count: usize) -> TestResult<Vec<Request>> {
        for _ in 0..WAIT_ATTEMPTS {
            let received = self.server.received_requests().await.unwrap_or_default();

            if received.len() >= count {
                return Ok(received);
            }

            tokio::time::sleep(WAIT_INTERVAL).await;
        }

        Err(format!("expected {count} webhook requests").into())
    }

    pub async fn received_count(&self) -> usize {
        self.server
            .received_requests()
            .await
            .unwrap_or_default()
            .len()
    }
}

/// Creates an endpoint for `event_types` and returns its id and secret.
pub async fn create_endpoint(
    server: &TestServer,
    tenant: &CreatedTenant,
    (url, event_types): (&str, &[&str]),
) -> TestResult<(String, String)> {
    let body = json!({ "url": url, "event_types": event_types });
    let created: Value = webhooks_request(server, tenant, (Method::POST, ""))
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let id = text(field(&created, "/endpoint/id"))?;
    let secret = text(field(&created, "/secret"))?;

    Ok((id, secret))
}

/// A request to `/auth/v1/admin/webhooks{suffix}` with the tenant's secret key.
pub fn webhooks_request(
    server: &TestServer,
    tenant: &CreatedTenant,
    (method, suffix): (Method, &str),
) -> reqwest::RequestBuilder {
    let url = server.url(&format!("/auth/v1/admin/webhooks{suffix}"));

    server
        .client
        .request(method, url)
        .header("apikey", &tenant.secret_key)
}

pub async fn send(request: reqwest::RequestBuilder) -> TestResult<Response> {
    Ok(request.send().await?)
}

pub fn text(value: &Value) -> TestResult<String> {
    let text = value
        .as_str()
        .ok_or_else(|| format!("expected a string, got {value}"))?;

    Ok(text.to_owned())
}

pub fn body_json(request: &Request) -> TestResult<Value> {
    Ok(serde_json::from_slice(&request.body)?)
}

pub fn header<'a>(request: &'a Request, name: &str) -> TestResult<&'a str> {
    let value = request
        .headers
        .get(name)
        .ok_or_else(|| format!("missing header {name}"))?;

    Ok(value.to_str()?)
}

/// Checks `webhook-signature` the way a Standard Webhooks receiver does: one of the `v1,`
/// signatures must be the HMAC-SHA256 of `id.timestamp.body` with the secret.
pub fn has_valid_signature(request: &Request, secret: &str) -> TestResult<bool> {
    let base64_key = secret
        .strip_prefix("whsec_")
        .ok_or("secret has no whsec_ prefix")?;
    let key = STANDARD.decode(base64_key)?;
    let id = header(request, "webhook-id")?;
    let timestamp = header(request, "webhook-timestamp")?;
    let mut mac = Hmac::<Sha256>::new_from_slice(&key)?;
    mac.update(format!("{id}.{timestamp}.").as_bytes());
    mac.update(&request.body);
    let expected = format!("v1,{}", STANDARD.encode(mac.finalize().into_bytes()));
    let signatures = header(request, "webhook-signature")?;

    Ok(signatures.split(' ').any(|signature| signature == expected))
}
