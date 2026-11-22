use serde_json::json;
use wiremock::matchers::{body_partial_json, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

/// The only secret the fake knows; any other is answered as Cloudflare answers unknown ones.
pub const TURNSTILE_SECRET: &str = "0x4AAAAAAAfake-secret";
pub const UNAVAILABLE_TURNSTILE_SECRET: &str = "0x4AAAAAAAfake-unavailable";
pub const TURNSTILE_SITE_KEY: &str = "0x4AAAAAAAfake-site-key";
/// The only token the fake accepts, as if the user solved the widget.
pub const SOLVED_TOKEN: &str = "solved-token";

const VERIFY_PATH: &str = "/turnstile/v0/siteverify";

/// A stand-in for Cloudflare Turnstile's `siteverify`.
pub struct FakeTurnstile {
    pub verify_url: String,
    /// Kept alive for the whole test: dropping it stops the fake.
    _server: MockServer,
}

impl FakeTurnstile {
    pub async fn start() -> Self {
        let server = MockServer::start().await;
        // Like Cloudflare: an unknown secret is a 400 with the reason in the body.
        let answers = [
            (
                json!({ "secret": UNAVAILABLE_TURNSTILE_SECRET }),
                200,
                json!({ "success": false, "error-codes": ["internal-error"] }),
            ),
            (
                json!({ "secret": TURNSTILE_SECRET, "response": SOLVED_TOKEN }),
                200,
                json!({ "success": true, "error-codes": [] }),
            ),
            (
                json!({ "secret": TURNSTILE_SECRET }),
                200,
                json!({ "success": false, "error-codes": ["invalid-input-response"] }),
            ),
            (
                json!({}),
                400,
                json!({ "success": false, "error-codes": ["invalid-input-secret"] }),
            ),
        ];

        for (priority, (request, status, answer)) in (1_u8..).zip(answers) {
            Mock::given(method("POST"))
                .and(path(VERIFY_PATH))
                .and(body_partial_json(request))
                .respond_with(ResponseTemplate::new(status).set_body_json(answer))
                .with_priority(priority)
                .mount(&server)
                .await;
        }

        Self {
            verify_url: format!("{}{VERIFY_PATH}", server.uri()),
            _server: server,
        }
    }
}
