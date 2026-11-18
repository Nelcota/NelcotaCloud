use serde::Serialize;
use utoipa::ToSchema;

/// Whether logins and signups need a captcha, and the public key the app renders it with.
#[derive(Debug, Serialize, ToSchema)]
pub struct CaptchaSettingsView {
    /// The Cloudflare Turnstile site key; `null` while the project asks for no captcha.
    pub site_key: Option<String>,
}
