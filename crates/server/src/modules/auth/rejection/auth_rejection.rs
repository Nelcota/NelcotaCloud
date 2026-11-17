use axum::http::StatusCode;

use crate::shared::http::api_error::{ApiError, Rejection};

/// Refusals of logins, sessions, emailed links and MFA codes.
#[derive(Debug, thiserror::Error)]
pub enum AuthRejection {
    #[error("invalid email or password")]
    InvalidCredentials,
    #[error("invalid refresh token")]
    InvalidRefreshToken,
    #[error("email is already registered")]
    EmailTaken,
    #[error("the token is invalid or expired")]
    InvalidToken,
    #[error("the authentication code is invalid")]
    InvalidMfaCode,
    #[error("the email is already verified")]
    EmailAlreadyVerified,
}

impl AuthRejection {
    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::InvalidCredentials => (StatusCode::UNAUTHORIZED, "invalid_credentials"),
            Self::InvalidRefreshToken => (StatusCode::UNAUTHORIZED, "invalid_refresh_token"),
            Self::EmailTaken => (StatusCode::CONFLICT, "email_taken"),
            Self::InvalidToken => (StatusCode::BAD_REQUEST, "invalid_token"),
            Self::InvalidMfaCode => (StatusCode::UNAUTHORIZED, "invalid_mfa_code"),
            Self::EmailAlreadyVerified => (StatusCode::CONFLICT, "email_already_verified"),
        }
    }
}

impl From<AuthRejection> for ApiError {
    fn from(rejection: AuthRejection) -> Self {
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
                AuthRejection::InvalidCredentials,
                StatusCode::UNAUTHORIZED,
                "invalid_credentials",
            ),
            (
                AuthRejection::InvalidRefreshToken,
                StatusCode::UNAUTHORIZED,
                "invalid_refresh_token",
            ),
            (
                AuthRejection::EmailTaken,
                StatusCode::CONFLICT,
                "email_taken",
            ),
            (
                AuthRejection::InvalidToken,
                StatusCode::BAD_REQUEST,
                "invalid_token",
            ),
            (
                AuthRejection::InvalidMfaCode,
                StatusCode::UNAUTHORIZED,
                "invalid_mfa_code",
            ),
            (
                AuthRejection::EmailAlreadyVerified,
                StatusCode::CONFLICT,
                "email_already_verified",
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
        let error = ApiError::from(AuthRejection::InvalidMfaCode);
        let rejection = match error {
            ApiError::Rejected(rejection) => Some(rejection),
            _ => None,
        };

        assert_eq!(
            rejection.as_ref().map(|rejection| rejection.code),
            Some("invalid_mfa_code")
        );
        assert_eq!(
            rejection.map(|rejection| rejection.message),
            Some("the authentication code is invalid".to_owned())
        );
    }
}
