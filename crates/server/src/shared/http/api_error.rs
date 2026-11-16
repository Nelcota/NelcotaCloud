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

        ApiError::Internal
    }

    pub fn invalid_request(error: impl Display) -> Self {
        ApiError::InvalidRequest(error.to_string())
    }

    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            ApiError::InvalidRequest(_) => (StatusCode::BAD_REQUEST, "invalid_request"),
            ApiError::UnsupportedMediaType => {
                (StatusCode::UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type")
            }
            ApiError::PayloadTooLarge => (StatusCode::PAYLOAD_TOO_LARGE, "payload_too_large"),
            ApiError::MissingApiKey => (StatusCode::UNAUTHORIZED, "missing_api_key"),
            ApiError::InvalidApiKey => (StatusCode::UNAUTHORIZED, "invalid_api_key"),
            ApiError::InvalidAccessToken => (StatusCode::UNAUTHORIZED, "invalid_access_token"),
            ApiError::InvalidCredentials => (StatusCode::UNAUTHORIZED, "invalid_credentials"),
            ApiError::InvalidRefreshToken => (StatusCode::UNAUTHORIZED, "invalid_refresh_token"),
            ApiError::EmailTaken => (StatusCode::CONFLICT, "email_taken"),
            ApiError::SlugTaken => (StatusCode::CONFLICT, "slug_taken"),
            ApiError::AdminAccessDenied => (StatusCode::UNAUTHORIZED, "admin_access_denied"),
            ApiError::SecretKeyRequired => (StatusCode::FORBIDDEN, "secret_key_required"),
            ApiError::UnknownOAuthProvider => (StatusCode::NOT_FOUND, "unknown_provider"),
            ApiError::OAuthProviderNotConfigured => {
                (StatusCode::BAD_REQUEST, "provider_not_configured")
            }
            ApiError::InvalidToken => (StatusCode::BAD_REQUEST, "invalid_token"),
            ApiError::InvalidOAuthCode => (StatusCode::UNAUTHORIZED, "invalid_oauth_code"),
            ApiError::EmailNotVerified => (StatusCode::FORBIDDEN, "email_not_verified"),
            ApiError::RateLimited => (StatusCode::TOO_MANY_REQUESTS, "too_many_requests"),
            ApiError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
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
