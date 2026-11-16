use std::fmt::Display;

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("{0}")]
    InvalidRequest(String),
    #[error("the request body must be JSON (Content-Type: application/json)")]
    UnsupportedMediaType,
    #[error("the request body is too large")]
    PayloadTooLarge,
    #[error("missing apikey header")]
    MissingApiKey,
    #[error("invalid API key")]
    InvalidApiKey,
    #[error("missing or invalid access token")]
    InvalidAccessToken,
    #[error("invalid email or password")]
    InvalidCredentials,
    #[error("invalid refresh token")]
    InvalidRefreshToken,
    #[error("email is already registered")]
    EmailTaken,
    #[error("tenant slug is already taken")]
    SlugTaken,
    #[error("admin access denied")]
    AdminAccessDenied,
    #[error("this operation requires the tenant's secret API key")]
    SecretKeyRequired,
    #[error("unknown OAuth provider")]
    UnknownOAuthProvider,
    #[error("this OAuth provider is not configured for the tenant")]
    OAuthProviderNotConfigured,
    #[error("the token is invalid or expired")]
    InvalidToken,
    #[error("the OAuth login code is invalid or expired")]
    InvalidOAuthCode,
    #[error("the email address must be verified before logging in")]
    EmailNotVerified,
    #[error("too many attempts, try again later")]
    RateLimited,
    #[error("internal server error")]
    Internal,
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
    message: String,
}

impl ApiError {
    /// Logs the real cause and answers with a generic message, so internals never reach clients.
    pub fn internal(error: impl Display) -> Self {
        tracing::error!(%error, "request failed");

        Self::Internal
    }

    pub fn invalid_request(error: impl Display) -> Self {
        Self::InvalidRequest(error.to_string())
    }

    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::InvalidRequest(_) => (StatusCode::BAD_REQUEST, "invalid_request"),
            Self::UnsupportedMediaType => {
                (StatusCode::UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type")
            }
            Self::PayloadTooLarge => (StatusCode::PAYLOAD_TOO_LARGE, "payload_too_large"),
            Self::MissingApiKey => (StatusCode::UNAUTHORIZED, "missing_api_key"),
            Self::InvalidApiKey => (StatusCode::UNAUTHORIZED, "invalid_api_key"),
            Self::InvalidAccessToken => (StatusCode::UNAUTHORIZED, "invalid_access_token"),
            Self::InvalidCredentials => (StatusCode::UNAUTHORIZED, "invalid_credentials"),
            Self::InvalidRefreshToken => (StatusCode::UNAUTHORIZED, "invalid_refresh_token"),
            Self::EmailTaken => (StatusCode::CONFLICT, "email_taken"),
            Self::SlugTaken => (StatusCode::CONFLICT, "slug_taken"),
            Self::AdminAccessDenied => (StatusCode::UNAUTHORIZED, "admin_access_denied"),
            Self::SecretKeyRequired => (StatusCode::FORBIDDEN, "secret_key_required"),
            Self::UnknownOAuthProvider => (StatusCode::NOT_FOUND, "unknown_provider"),
            Self::OAuthProviderNotConfigured => {
                (StatusCode::BAD_REQUEST, "provider_not_configured")
            }
            Self::InvalidToken => (StatusCode::BAD_REQUEST, "invalid_token"),
            Self::InvalidOAuthCode => (StatusCode::UNAUTHORIZED, "invalid_oauth_code"),
            Self::EmailNotVerified => (StatusCode::FORBIDDEN, "email_not_verified"),
            Self::RateLimited => (StatusCode::TOO_MANY_REQUESTS, "too_many_requests"),
            Self::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, code) = self.status_and_code();
        let body = ErrorBody {
            error: code,
            message: self.to_string(),
        };

        (status, Json(body)).into_response()
    }
}
