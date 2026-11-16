use std::collections::HashMap;
use std::future::IntoFuture;

use axum::extract::Form;
use axum::http::header::AUTHORIZATION;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{Value, json};
use tokio::net::TcpListener;

use crate::support::TestResult;

pub const FAKE_CLIENT_ID: &str = "fake-client-id";
pub const FAKE_CLIENT_SECRET: &str = "fake-client-secret";

/// A stand-in for GitHub's OAuth and API endpoints. The authorization `code` the test sends to
/// our callback encodes the account: `{github_user_id}:{email}:{is_email_verified}`. The fake
/// hands that same string back as the access token, and reads the profile from it.
pub struct FakeGitHub {
    pub base_url: String,
}

pub struct FakeAccount<'a> {
    pub github_user_id: u64,
    pub email: &'a str,
    pub is_email_verified: bool,
}

impl FakeAccount<'_> {
    pub fn authorization_code(&self) -> String {
        format!(
            "{}:{}:{}",
            self.github_user_id, self.email, self.is_email_verified
        )
    }
}

impl FakeGitHub {
    pub async fn start() -> TestResult<Self> {
        let router = Router::new()
            .route("/login/oauth/access_token", post(issue_token))
            .route("/user", get(user))
            .route("/user/emails", get(user_emails));
        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let base_url = format!("http://{}", listener.local_addr()?);
        let _fake_task = tokio::spawn(axum::serve(listener, router).into_future());

        Ok(Self { base_url })
    }
}

async fn issue_token(Form(form): Form<HashMap<String, String>>) -> (StatusCode, Json<Value>) {
    let client_id = form.get("client_id").map(String::as_str);
    let client_secret = form.get("client_secret").map(String::as_str);

    if client_id != Some(FAKE_CLIENT_ID) || client_secret != Some(FAKE_CLIENT_SECRET) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "invalid_client" })),
        );
    }

    // PKCE must be present: the server sends the verifier it stored at /authorize.
    if form
        .get("code_verifier")
        .is_some_and(|verifier| verifier.len() >= 43)
        == false
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid_grant" })),
        );
    }

    let Some(code) = form.get("code") else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "invalid_grant" })),
        );
    };

    (
        StatusCode::OK,
        Json(json!({ "access_token": code, "token_type": "bearer" })),
    )
}

async fn user(headers: HeaderMap) -> (StatusCode, Json<Value>) {
    let Some((github_user_id, _, _)) = parse_account(&headers) else {
        return (StatusCode::UNAUTHORIZED, Json(json!({})));
    };

    (
        StatusCode::OK,
        Json(json!({ "id": github_user_id, "email": null })),
    )
}

async fn user_emails(headers: HeaderMap) -> (StatusCode, Json<Value>) {
    let Some((_, email, is_verified)) = parse_account(&headers) else {
        return (StatusCode::UNAUTHORIZED, Json(json!([])));
    };
    let emails = json!([
        { "email": "secondary@example.com", "primary": false, "verified": true },
        { "email": email, "primary": true, "verified": is_verified },
    ]);

    (StatusCode::OK, Json(emails))
}

fn parse_account(headers: &HeaderMap) -> Option<(u64, String, bool)> {
    let authorization = headers.get(AUTHORIZATION)?.to_str().ok()?;
    let token = authorization.strip_prefix("Bearer ")?;
    let mut parts = token.splitn(3, ':');
    let github_user_id = parts.next()?.parse().ok()?;
    let email = parts.next()?.to_owned();
    let is_verified = parts.next()? == "true";

    Some((github_user_id, email, is_verified))
}
