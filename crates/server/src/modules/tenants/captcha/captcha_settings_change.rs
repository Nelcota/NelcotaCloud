use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::{Validate, ValidationError};

use crate::app_state::AppState;
use crate::modules::tenants::captcha::captcha_settings_repository::captcha_secret_context;
use crate::modules::tenants::captcha::captcha_site_verify::SiteVerifyRequest;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

/// A token Cloudflare can only refuse: enough to learn whether it knows the secret.
const PROBE_TOKEN: &str = "nelcota-secret-check";

/// The keys of a Turnstile widget created in the project's Cloudflare account.
#[derive(Deserialize, Validate, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CaptchaSettingsBody {
    #[validate(length(min = 1, max = 200), custom(function = check_key_characters))]
    pub site_key: String,
    #[validate(length(min = 1, max = 200), custom(function = check_key_characters))]
    pub secret_key: String,
}

/// Keys are pasted from the Cloudflare dashboard; spaces or line breaks are copy mistakes.
fn check_key_characters(key: &str) -> Result<(), ValidationError> {
    if key
        .chars()
        .any(|character| character.is_whitespace() || character.is_control())
    {
        return Err(ValidationError::new("key_characters")
            .with_message("must not contain spaces or line breaks".into()));
    }

    Ok(())
}

/// Checks the secret with Cloudflare before opening the transaction that stores it.
pub async fn prepare_captcha_secret(
    state: &AppState,
    tenant_id: Uuid,
    body: &CaptchaSettingsBody,
) -> Result<Vec<u8>, ApiError> {
    ensure_secret_is_known(state, &body.secret_key).await?;
    let context = captcha_secret_context(tenant_id);
    state
        .secret_box
        .seal(body.secret_key.as_bytes(), &context)
        .map_err(ApiError::internal)
}

/// A wrong secret would refuse every login, so it is refused here instead.
async fn ensure_secret_is_known(state: &AppState, secret: &str) -> Result<(), ApiError> {
    let probe = SiteVerifyRequest {
        secret,
        response: PROBE_TOKEN,
        remoteip: None,
    };
    let outcome = state
        .site_verifier()
        .verify(&probe)
        .await
        .map_err(|error| {
            tracing::warn!(%error, "could not reach Turnstile");
            ApiError::from(TenantsRejection::CaptchaUnavailable)
        })?;

    if outcome.has_invalid_secret() {
        return Err(ApiError::from(TenantsRejection::InvalidCaptchaSecret));
    }

    // The deliberately invalid response must be the sole refusal. Provider errors do not
    // establish whether a secret works, so the current settings must stay in force.
    if outcome.success || outcome.error_codes.as_slice() == ["invalid-input-response"] {
        return Ok(());
    }

    Err(TenantsRejection::CaptchaUnavailable.into())
}
