use axum::http::StatusCode;

use crate::shared::http::api_error::{ApiError, Rejection};

/// Refusals of OAuth logins and provider settings.
#[derive(Debug, thiserror::Error)]
pub enum OAuthRejection {
    #[error("unknown OAuth provider")]
    UnknownOAuthProvider,
    #[error("this OAuth provider is not configured for the tenant")]
    OAuthProviderNotConfigured,
    #[error("the OAuth login code is invalid or expired")]
    InvalidOAuthCode,
}

impl OAuthRejection {
    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::UnknownOAuthProvider => (StatusCode::NOT_FOUND, "unknown_provider"),
            Self::OAuthProviderNotConfigured => {
                (StatusCode::BAD_REQUEST, "provider_not_configured")
            }
            Self::InvalidOAuthCode => (StatusCode::UNAUTHORIZED, "invalid_oauth_code"),
        }
    }
}

impl From<OAuthRejection> for ApiError {
    fn from(rejection: OAuthRejection) -> Self {
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
                OAuthRejection::UnknownOAuthProvider,
                StatusCode::NOT_FOUND,
                "unknown_provider",
            ),
            (
                OAuthRejection::OAuthProviderNotConfigured,
                StatusCode::BAD_REQUEST,
                "provider_not_configured",
            ),
            (
                OAuthRejection::InvalidOAuthCode,
                StatusCode::UNAUTHORIZED,
                "invalid_oauth_code",
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
        let error = ApiError::from(OAuthRejection::InvalidOAuthCode);
        let rejection = match error {
            ApiError::Rejected(rejection) => Some(rejection),
            _ => None,
        };

        assert_eq!(
            rejection.as_ref().map(|rejection| rejection.code),
            Some("invalid_oauth_code")
        );
        assert_eq!(
            rejection.map(|rejection| rejection.message),
            Some("the OAuth login code is invalid or expired".to_owned())
        );
    }
}
