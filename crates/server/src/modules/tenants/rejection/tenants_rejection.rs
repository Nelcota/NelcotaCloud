use axum::http::StatusCode;

use crate::shared::http::api_error::{ApiError, Rejection};

/// Refusals of tenant access (API keys, access tokens, the console platform) and delivery.
#[derive(Debug, thiserror::Error)]
pub enum TenantsRejection {
    #[error("missing apikey header")]
    MissingApiKey,
    #[error("invalid API key")]
    InvalidApiKey,
    #[error("missing or invalid access token")]
    InvalidAccessToken,
    #[error("tenant slug is already taken")]
    SlugTaken,
    #[error("admin access denied")]
    AdminAccessDenied,
    #[error("this operation requires the tenant's secret API key")]
    SecretKeyRequired,
    #[error("the email address must be verified before logging in")]
    EmailNotVerified,
    #[error("this user is banned")]
    UserBanned,
    #[error("the platform API is not configured on this server")]
    PlatformNotConfigured,
    #[error("you are not a member of this project")]
    ProjectAccessDenied,
    #[error("the SMTP server did not accept the email")]
    SmtpDeliveryFailed,
    #[error("this project requires a captcha token")]
    CaptchaRequired,
    #[error("the captcha was not solved")]
    CaptchaFailed,
    #[error("the captcha could not be checked, try again")]
    CaptchaUnavailable,
    #[error("Cloudflare does not recognize this Turnstile secret key")]
    InvalidCaptchaSecret,
    #[error("requests from this address are blocked")]
    AddressBlocked,
}

impl TenantsRejection {
    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::MissingApiKey => (StatusCode::UNAUTHORIZED, "missing_api_key"),
            Self::InvalidApiKey => (StatusCode::UNAUTHORIZED, "invalid_api_key"),
            Self::InvalidAccessToken => (StatusCode::UNAUTHORIZED, "invalid_access_token"),
            Self::SlugTaken => (StatusCode::CONFLICT, "slug_taken"),
            Self::AdminAccessDenied => (StatusCode::UNAUTHORIZED, "admin_access_denied"),
            Self::SecretKeyRequired => (StatusCode::FORBIDDEN, "secret_key_required"),
            Self::EmailNotVerified => (StatusCode::FORBIDDEN, "email_not_verified"),
            Self::UserBanned => (StatusCode::FORBIDDEN, "user_banned"),
            Self::PlatformNotConfigured => {
                (StatusCode::SERVICE_UNAVAILABLE, "platform_not_configured")
            }
            Self::ProjectAccessDenied => (StatusCode::FORBIDDEN, "project_access_denied"),
            Self::SmtpDeliveryFailed => (StatusCode::BAD_GATEWAY, "smtp_delivery_failed"),
            Self::CaptchaRequired => (StatusCode::BAD_REQUEST, "captcha_required"),
            Self::CaptchaFailed => (StatusCode::BAD_REQUEST, "captcha_failed"),
            Self::CaptchaUnavailable => (StatusCode::SERVICE_UNAVAILABLE, "captcha_unavailable"),
            Self::InvalidCaptchaSecret => (StatusCode::BAD_REQUEST, "invalid_captcha_secret"),
            Self::AddressBlocked => (StatusCode::FORBIDDEN, "address_blocked"),
        }
    }
}

impl From<TenantsRejection> for ApiError {
    fn from(rejection: TenantsRejection) -> Self {
        let (status, code) = rejection.status_and_code();

        Self::Rejected(Rejection {
            status,
            code,
            message: rejection.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    /// Clients match on these codes: changing one is a breaking change of the API.
    #[test]
    fn every_refusal_keeps_its_status_and_a_unique_code() {
        let cases = [
            (
                TenantsRejection::MissingApiKey,
                StatusCode::UNAUTHORIZED,
                "missing_api_key",
            ),
            (
                TenantsRejection::InvalidApiKey,
                StatusCode::UNAUTHORIZED,
                "invalid_api_key",
            ),
            (
                TenantsRejection::InvalidAccessToken,
                StatusCode::UNAUTHORIZED,
                "invalid_access_token",
            ),
            (
                TenantsRejection::SlugTaken,
                StatusCode::CONFLICT,
                "slug_taken",
            ),
            (
                TenantsRejection::AdminAccessDenied,
                StatusCode::UNAUTHORIZED,
                "admin_access_denied",
            ),
            (
                TenantsRejection::SecretKeyRequired,
                StatusCode::FORBIDDEN,
                "secret_key_required",
            ),
            (
                TenantsRejection::EmailNotVerified,
                StatusCode::FORBIDDEN,
                "email_not_verified",
            ),
            (
                TenantsRejection::UserBanned,
                StatusCode::FORBIDDEN,
                "user_banned",
            ),
            (
                TenantsRejection::PlatformNotConfigured,
                StatusCode::SERVICE_UNAVAILABLE,
                "platform_not_configured",
            ),
            (
                TenantsRejection::ProjectAccessDenied,
                StatusCode::FORBIDDEN,
                "project_access_denied",
            ),
            (
                TenantsRejection::SmtpDeliveryFailed,
                StatusCode::BAD_GATEWAY,
                "smtp_delivery_failed",
            ),
            (
                TenantsRejection::CaptchaRequired,
                StatusCode::BAD_REQUEST,
                "captcha_required",
            ),
            (
                TenantsRejection::CaptchaFailed,
                StatusCode::BAD_REQUEST,
                "captcha_failed",
            ),
            (
                TenantsRejection::CaptchaUnavailable,
                StatusCode::SERVICE_UNAVAILABLE,
                "captcha_unavailable",
            ),
            (
                TenantsRejection::InvalidCaptchaSecret,
                StatusCode::BAD_REQUEST,
                "invalid_captcha_secret",
            ),
            (
                TenantsRejection::AddressBlocked,
                StatusCode::FORBIDDEN,
                "address_blocked",
            ),
        ];
        let mut seen_codes = HashSet::new();

        for (rejection, status, code) in cases {
            assert_eq!(rejection.status_and_code(), (status, code));
            assert!(seen_codes.insert(code), "duplicate code {code}");
        }
    }

    #[test]
    fn becomes_an_api_error_with_its_code_and_message() {
        let error = ApiError::from(TenantsRejection::UserBanned);
        let rejection = match error {
            ApiError::Rejected(rejection) => Some(rejection),
            _ => None,
        };

        assert_eq!(
            rejection.as_ref().map(|rejection| rejection.code),
            Some("user_banned")
        );
        assert_eq!(
            rejection.map(|rejection| rejection.message),
            Some("this user is banned".to_owned())
        );
    }
}
