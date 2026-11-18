use std::fmt::Display;
use std::time::Duration;

use axum::Json;
use axum::http::header::RETRY_AFTER;
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use utoipa::ToSchema;

/// What a handler answers when it cannot do what was asked. Only refusals any HTTP API has live
/// here; each module defines its own and turns them into a `Rejection`.
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("{0}")]
    InvalidRequest(String),
    #[error("the request body must be JSON (Content-Type: application/json)")]
    UnsupportedMediaType,
    #[error("the request body is too large")]
    PayloadTooLarge,
    /// Answered with `Retry-After`, so clients wait instead of retrying at once.
    #[error("too many attempts, try again later")]
    RateLimited(Duration),
    /// The server is out of capacity for this kind of work right now (not the client's fault).
    #[error("the server is busy, try again shortly")]
    ServiceBusy,
    #[error("{0} not found")]
    NotFound(&'static str),
    #[error("{0}")]
    Conflict(String),
    #[error("{}", .0.message)]
    Rejected(Rejection),
    #[error("internal server error")]
    Internal,
}

/// A refusal defined by a module: its HTTP status, the stable code clients match on, and a
/// message for people.
#[derive(Debug)]
pub struct Rejection {
    pub status: StatusCode,
    pub code: &'static str,
    pub message: String,
}

#[derive(Serialize, ToSchema)]
pub struct ErrorBody {
    pub error: &'static str,
    pub message: String,
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

    /// The stable code of a module's refusal; `None` for every other error.
    pub fn rejection_code(&self) -> Option<&'static str> {
        let Self::Rejected(rejection) = self else {
            return None;
        };

        Some(rejection.code)
    }

    /// Whole seconds to wait, rounded up so a client never comes back too early.
    fn retry_after_seconds(&self) -> Option<u64> {
        let Self::RateLimited(wait) = self else {
            return None;
        };
        let rounded_up = wait
            .as_secs()
            .saturating_add(u64::from(wait.subsec_nanos() > 0));

        Some(rounded_up.max(1))
    }

    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::InvalidRequest(_) => (StatusCode::BAD_REQUEST, "invalid_request"),
            Self::UnsupportedMediaType => {
                (StatusCode::UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type")
            }
            Self::PayloadTooLarge => (StatusCode::PAYLOAD_TOO_LARGE, "payload_too_large"),
            Self::RateLimited(_) => (StatusCode::TOO_MANY_REQUESTS, "too_many_requests"),
            Self::ServiceBusy => (StatusCode::SERVICE_UNAVAILABLE, "service_busy"),
            Self::NotFound(_) => (StatusCode::NOT_FOUND, "not_found"),
            Self::Conflict(_) => (StatusCode::CONFLICT, "conflict"),
            Self::Rejected(rejection) => (rejection.status, rejection.code),
            Self::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
        }
    }
}

/// Database failures are never the client's fault: logged, answered as a generic 500.
impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        Self::internal(error)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, code) = self.status_and_code();
        let retry_after = self.retry_after_seconds();
        let body = ErrorBody {
            error: code,
            message: self.to_string(),
        };
        let mut response = (status, Json(body)).into_response();

        if let Some(seconds) = retry_after {
            response
                .headers_mut()
                .insert(RETRY_AFTER, HeaderValue::from(seconds));
        }

        response
    }
}

#[cfg(test)]
mod tests {
    use axum::body::to_bytes;

    use super::*;

    async fn body_of(response: Response) -> serde_json::Value {
        let bytes = to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap_or_default();

        serde_json::from_slice(&bytes).unwrap_or_default()
    }

    #[tokio::test]
    async fn a_rejection_answers_with_its_own_status_code_and_message() {
        let rejection = Rejection {
            status: StatusCode::IM_A_TEAPOT,
            code: "teapot",
            message: "short and stout".to_owned(),
        };
        let response = ApiError::Rejected(rejection).into_response();

        assert_eq!(response.status(), StatusCode::IM_A_TEAPOT);
        let body = body_of(response).await;
        assert_eq!(
            body.get("error").and_then(serde_json::Value::as_str),
            Some("teapot")
        );
        assert_eq!(
            body.get("message").and_then(serde_json::Value::as_str),
            Some("short and stout")
        );
    }

    /// The database's message may name tables or values: it must never reach the client.
    #[tokio::test]
    async fn database_errors_become_a_generic_internal_error() {
        let error = ApiError::from(sqlx::Error::RowNotFound);
        let response = error.into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
        let body = body_of(response).await;
        assert_eq!(
            body.get("error").and_then(serde_json::Value::as_str),
            Some("internal_error")
        );
        assert_eq!(
            body.get("message").and_then(serde_json::Value::as_str),
            Some("internal server error")
        );
    }

    #[test]
    fn rate_limits_say_how_long_to_wait() {
        let response = ApiError::RateLimited(Duration::from_millis(2_100)).into_response();
        let retry_after = response.headers().get(RETRY_AFTER).cloned();

        assert_eq!(retry_after, Some(HeaderValue::from(3_u64)));
    }

    #[test]
    fn generic_errors_keep_their_codes() {
        let cases = [
            (
                ApiError::InvalidRequest("x".to_owned()),
                StatusCode::BAD_REQUEST,
                "invalid_request",
            ),
            (
                ApiError::RateLimited(Duration::from_secs(1)),
                StatusCode::TOO_MANY_REQUESTS,
                "too_many_requests",
            ),
            (
                ApiError::ServiceBusy,
                StatusCode::SERVICE_UNAVAILABLE,
                "service_busy",
            ),
            (
                ApiError::NotFound("user"),
                StatusCode::NOT_FOUND,
                "not_found",
            ),
            (
                ApiError::Conflict("x".to_owned()),
                StatusCode::CONFLICT,
                "conflict",
            ),
        ];

        for (error, status, code) in cases {
            assert_eq!(error.status_and_code(), (status, code));
        }
    }
}
