use serde_json::json;
use url::form_urlencoded;
use wiremock::matchers::{body_string_contains, header, header_exists, method, path};
use wiremock::{Mock, MockServer, Request, ResponseTemplate};

pub const FAKE_CLIENT_ID: &str = "fake-client-id";
pub const FAKE_CLIENT_SECRET: &str = "fake-client-secret";
const MIN_PKCE_VERIFIER_LENGTH: usize = 43;

/// A stand-in for GitHub's OAuth and API endpoints. The authorization `code` the test sends to
/// our callback encodes the account: `{github_user_id}:{email}:{is_email_verified}`. The fake
/// hands that same string back as the access token, and reads the profile from it.
pub struct FakeGitHub {
    pub base_url: String,
    /// Kept alive for the whole test: dropping it stops the fake.
    _server: MockServer,
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
    pub async fn start() -> Self {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/login/oauth/access_token"))
            .and(header("accept", "application/json"))
            .and(header("content-type", "application/x-www-form-urlencoded"))
            .and(body_string_contains("grant_type=authorization_code"))
            .and(body_string_contains(format!("client_id={FAKE_CLIENT_ID}")))
            .and(body_string_contains(format!(
                "client_secret={FAKE_CLIENT_SECRET}"
            )))
            .respond_with(issue_token)
            .mount(&server)
            .await;
        // Any other token request carries wrong client credentials.
        Mock::given(method("POST"))
            .and(path("/login/oauth/access_token"))
            .respond_with(oauth_error("invalid_client", 401))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/user"))
            .and(header_exists("authorization"))
            .respond_with(user)
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/user/emails"))
            .and(header_exists("authorization"))
            .respond_with(user_emails)
            .mount(&server)
            .await;

        Self {
            base_url: server.uri(),
            _server: server,
        }
    }
}

fn issue_token(request: &Request) -> ResponseTemplate {
    let form_value = |name: &str| {
        form_urlencoded::parse(&request.body)
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
    };

    // PKCE must be present: the server sends the verifier it stored at /authorize.
    if form_value("code_verifier")
        .is_some_and(|verifier| verifier.len() >= MIN_PKCE_VERIFIER_LENGTH)
        == false
    {
        return oauth_error("invalid_grant", 400);
    }

    let code = match form_value("code") {
        Some(code) => code,
        None => return oauth_error("invalid_grant", 400),
    };

    ResponseTemplate::new(200)
        .set_body_json(json!({ "access_token": code, "token_type": "bearer" }))
}

fn user(request: &Request) -> ResponseTemplate {
    let github_user_id = match parse_account(request) {
        Some((github_user_id, _, _)) => github_user_id,
        None => return ResponseTemplate::new(401).set_body_json(json!({})),
    };

    ResponseTemplate::new(200).set_body_json(json!({ "id": github_user_id, "email": null }))
}

fn user_emails(request: &Request) -> ResponseTemplate {
    let (email, is_verified) = match parse_account(request) {
        Some((_, email, is_verified)) => (email, is_verified),
        None => return ResponseTemplate::new(401).set_body_json(json!([])),
    };
    let emails = json!([
        { "email": "secondary@example.com", "primary": false, "verified": true },
        { "email": email, "primary": true, "verified": is_verified },
    ]);

    ResponseTemplate::new(200).set_body_json(emails)
}

fn oauth_error(code: &str, status: u16) -> ResponseTemplate {
    ResponseTemplate::new(status).set_body_json(json!({ "error": code }))
}

fn parse_account(request: &Request) -> Option<(u64, String, bool)> {
    let authorization = request.headers.get("authorization")?.to_str().ok()?;
    let token = authorization.strip_prefix("Bearer ")?;
    let mut parts = token.splitn(3, ':');
    let github_user_id = parts.next()?.parse().ok()?;
    let email = parts.next()?.to_owned();
    let is_verified = parts.next()? == "true";

    Some((github_user_id, email, is_verified))
}
