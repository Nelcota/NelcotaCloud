use std::time::Duration;

use reqwest::{Method, StatusCode};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};

const TENANT_SENDER: &str = "acme-mail@tenant.test";

#[derive(Deserialize)]
struct MailpitSearch {
    messages: Vec<MailpitSummary>,
}

#[derive(Deserialize)]
struct MailpitSummary {
    #[serde(rename = "From")]
    from: MailpitAddress,
}

#[derive(Deserialize)]
struct MailpitAddress {
    #[serde(rename = "Address")]
    address: String,
}

async fn smtp_request(
    server: &TestServer,
    tenant: &CreatedTenant,
    method: Method,
    body: Option<Value>,
) -> TestResult<reqwest::Response> {
    let mut request = server
        .client
        .request(method, server.url("/auth/v1/admin/smtp"))
        .header("apikey", &tenant.secret_key);

    if let Some(body) = body {
        request = request.json(&body);
    }

    Ok(request.send().await?)
}

/// The sender of the newest email to `recipient`, once it arrives.
async fn sender_of_latest_email(recipient: &str) -> TestResult<String> {
    let mailpit_url = std::env::var("MAILPIT_API_URL")?;
    let client = reqwest::Client::new();

    for _ in 0..50 {
        let search: MailpitSearch = client
            .get(format!("{mailpit_url}/api/v1/search"))
            .query(&[("query", format!("to:\"{recipient}\""))])
            .send()
            .await?
            .json()
            .await?;

        if let Some(latest) = search.messages.first() {
            return Ok(latest.from.address.clone());
        }

        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    Err(format!("no email arrived for {recipient}").into())
}

#[tokio::test]
async fn auth_emails_go_through_the_tenant_smtp_server() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let smtp_url = std::env::var("SMTP_URL")?;
    let settings = json!({
        "smtp_url": smtp_url.replace("smtp://", "smtp://mailer:s3cret-pass@"),
        "email_from": format!("Acme Mail <{TENANT_SENDER}>"),
    });

    let saved = smtp_request(&server, &tenant, Method::PUT, Some(settings)).await?;
    assert_eq!(saved.status(), StatusCode::OK);
    let saved_text = saved.text().await?;
    assert!(saved_text.contains("s3cret-pass") == false);
    let view: Value = serde_json::from_str(&saved_text)?;
    assert_eq!(field(&view, "/is_custom"), true);

    let email = unique_email("tenant-smtp");
    server.sign_up(&tenant, &email).await?;
    assert_eq!(sender_of_latest_email(&email).await?, TENANT_SENDER);

    let reset = smtp_request(&server, &tenant, Method::DELETE, None).await?;
    assert_eq!(reset.status(), StatusCode::NO_CONTENT);
    let current: Value = smtp_request(&server, &tenant, Method::GET, None)
        .await?
        .json()
        .await?;
    assert_eq!(field(&current, "/is_custom"), false);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_invalid_smtp_settings() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    for settings in [
        json!({ "smtp_url": "http://smtp.example.com", "email_from": "a@b.test" }),
        json!({ "smtp_url": "smtps://smtp.example.com", "email_from": "not an address" }),
    ] {
        let response = smtp_request(&server, &tenant, Method::PUT, Some(settings)).await?;

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    server.drop_tenant(&tenant).await
}
