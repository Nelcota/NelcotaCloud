use reqwest::StatusCode;
use serde_json::json;

use crate::support::{TestResult, TestServer, unique_email};

const BLANK_PASSWORD: &str = "          ";

#[tokio::test]
async fn rejects_whitespace_only_passwords() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;

    let signup_body = json!({ "email": unique_email("blank"), "password": BLANK_PASSWORD });
    let signup = server
        .post_auth("/auth/v1/signup", api_key, signup_body)
        .await?;
    assert_eq!(signup.status(), StatusCode::BAD_REQUEST);

    let reset_body = json!({ "token": "nc_pr_any", "password": BLANK_PASSWORD });
    let reset = server
        .post_auth("/auth/v1/reset-password", api_key, reset_body)
        .await?;
    assert_eq!(reset.status(), StatusCode::BAD_REQUEST);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn accepts_the_bearer_scheme_in_any_case() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("scheme")).await?;

    for scheme in ["bearer", "BEARER"] {
        let response = server
            .client
            .get(server.url("/auth/v1/user"))
            .header("apikey", &tenant.publishable_key)
            .header(
                "authorization",
                format!("{scheme} {}", session.access_token),
            )
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::OK);
    }

    let blank = server
        .client
        .get(server.url("/auth/v1/user"))
        .header("apikey", &tenant.publishable_key)
        .header("authorization", "Bearer    ")
        .send()
        .await?;
    assert_eq!(blank.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn blank_tokens_and_keys_are_rejected_not_crashed() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;

    let blank_key = server
        .post_auth("/auth/v1/refresh", "   ", json!({ "refresh_token": "x" }))
        .await?;
    assert_eq!(blank_key.status(), StatusCode::UNAUTHORIZED);

    let blank_refresh = server
        .post_auth(
            "/auth/v1/refresh",
            api_key,
            json!({ "refresh_token": "   " }),
        )
        .await?;
    assert_eq!(blank_refresh.status(), StatusCode::UNAUTHORIZED);

    let blank_verification = server
        .post_auth("/auth/v1/verify-email", api_key, json!({ "token": "   " }))
        .await?;
    assert_eq!(blank_verification.status(), StatusCode::BAD_REQUEST);

    let null_email = server
        .post_auth(
            "/auth/v1/login",
            api_key,
            json!({ "email": null, "password": "x" }),
        )
        .await?;
    assert_eq!(null_email.status(), StatusCode::BAD_REQUEST);

    server.drop_tenant(&tenant).await
}
