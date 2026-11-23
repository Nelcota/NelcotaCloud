use axum::http::HeaderName;

use crate::app_config::AppConfig;
use crate::app_state::AppSettings;
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::oauth::provider::provider_endpoints::OAuthEndpoints;
use crate::shared::crypto::hex_encoding::encode_hex;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::crypto::random_bytes::random_bytes;
use crate::startup::startup_error::StartupError;

const DUMMY_PASSWORD_BYTES: usize = 32;
const TURNSTILE_VERIFY_URL: &str = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/// Derives the runtime settings from the validated configuration.
pub async fn build_settings(
    config: &AppConfig,
    oauth_endpoints: OAuthEndpoints,
) -> Result<AppSettings, StartupError> {
    let unguessable_password = encode_hex(&random_bytes::<DUMMY_PASSWORD_BYTES>());

    Ok(AppSettings {
        webhook_worker_replicas: config.expected_webhook_workers(),
        token_issuer: config.token_issuer(),
        admin_token_hash: hash_opaque_token(config.admin_token.trim()),
        dummy_password_hash: hash_password(unguessable_password).await?,
        oauth_endpoints,
        oauth_callback_url: config.oauth_callback_url(),
        client_ip_header: parse_client_ip_header(config.client_ip_header.as_deref())?,
        captcha_verify_url: config
            .captcha_verify_url
            .clone()
            .unwrap_or_else(|| TURNSTILE_VERIFY_URL.to_owned()),
        direct_connection: config.direct_connection()?,
    })
}

/// An unset or blank `CLIENT_IP_HEADER` means the TCP peer address is the client IP.
pub(super) fn parse_client_ip_header(
    raw_header: Option<&str>,
) -> Result<Option<HeaderName>, StartupError> {
    let header = raw_header
        .map(str::trim)
        .filter(|header| header.is_empty() == false)
        .map(|header| HeaderName::from_bytes(header.to_lowercase().as_bytes()))
        .transpose()?;

    Ok(header)
}
