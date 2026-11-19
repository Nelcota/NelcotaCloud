use std::net::IpAddr;

use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::captcha::captcha_settings_repository::{
    captcha_secret_context, find_captcha_settings,
};
use crate::modules::tenants::captcha::captcha_site_verify::{SiteVerifier, SiteVerifyRequest};
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::crypto::secret_box::SecretBox;
use crate::shared::http::api_error::ApiError;

/// The captcha token a client sent with a login, signup or email request.
pub struct CaptchaAnswer<'a> {
    pub token: Option<&'a str>,
    pub client_ip: IpAddr,
}

pub struct CaptchaRequirement<'a> {
    pub control_plane_pool: &'a PgPool,
    pub secret_box: &'a SecretBox,
    pub verifier: SiteVerifier<'a>,
}

/// Lets the request through when the project asks for no captcha or Cloudflare accepts the token.
///
/// If Cloudflare cannot be reached the request is refused (503): a captcha that passes whenever
/// its checker is down protects nothing.
pub async fn require_captcha(
    requirement: &CaptchaRequirement<'_>,
    tenant_id: Uuid,
    answer: CaptchaAnswer<'_>,
) -> Result<(), ApiError> {
    let settings = find_captcha_settings(requirement.control_plane_pool, tenant_id).await?;
    let settings = match settings {
        Some(settings) => settings,
        None => return Ok(()),
    };
    let token = answer
        .token
        .filter(|token| token.trim().is_empty() == false)
        .ok_or(TenantsRejection::CaptchaRequired)?;
    let context = captcha_secret_context(tenant_id);
    let secret_bytes = requirement
        .secret_box
        .open(&settings.secret_key_ciphertext, &context)
        .map_err(ApiError::internal)?;
    let secret = String::from_utf8(secret_bytes).map_err(ApiError::internal)?;
    let request = SiteVerifyRequest {
        secret: &secret,
        response: token,
        remoteip: Some(answer.client_ip.to_string()),
    };
    let outcome = requirement
        .verifier
        .verify(&request)
        .await
        .map_err(|error| {
            tracing::warn!(%error, "could not reach Turnstile");
            ApiError::from(TenantsRejection::CaptchaUnavailable)
        })?;

    if outcome.success == false {
        return Err(ApiError::from(TenantsRejection::CaptchaFailed));
    }

    Ok(())
}
