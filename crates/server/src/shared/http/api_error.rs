use std::fmt::Display;

use axum::Json;
use axum::http::StatusCode;
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
    #[error("too many attempts, try again later")]
    RateLimited,
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

    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::InvalidRequest(_) => (StatusCode::BAD_REQUEST, "invalid_request"),
            Self::UnsupportedMediaType => {
                (StatusCode::UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type")
            }
            Self::PayloadTooLarge => (StatusCode::PAYLOAD_TOO_LARGE, "payload_too_large"),
            Self::RateLimited => (StatusCode::TOO_MANY_REQUESTS, "too_many_requests"),
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
        let body = ErrorBody {
            error: code,
            message: self.to_string(),
        };

        (status, Json(body)).into_response()
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
    fn generic_errors_keep_their_codes() {
        let cases = [
            (
                ApiError::InvalidRequest("x".to_owned()),
                StatusCode::BAD_REQUEST,
                "invalid_request",
            ),
            (
                ApiError::RateLimited,
                StatusCode::TOO_MANY_REQUESTS,
                "too_many_requests",
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
