use axum::http::StatusCode;

use crate::modules::webhooks::endpoint::webhook_endpoint_error::WebhookEndpointError;
use crate::shared::http::api_error::{ApiError, Rejection};

/// Refusals of the webhook endpoints API.
#[derive(Debug, thiserror::Error)]
pub enum WebhooksRejection {
    #[error("a project can have at most 5 webhook endpoints")]
    EndpointLimitReached,
}

impl WebhooksRejection {
    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::EndpointLimitReached => (StatusCode::CONFLICT, "webhook_endpoint_limit"),
        }
    }
}

impl From<WebhooksRejection> for ApiError {
    fn from(rejection: WebhooksRejection) -> Self {
        let (status, code) = rejection.status_and_code();

        Self::Rejected(Rejection {
            status,
            code,
            message: rejection.to_string(),
        })
    }
}

/// Mistakes in what the owner sent are 400s; a missing endpoint is a 404; the rest is ours.
pub fn endpoint_error_response(error: WebhookEndpointError) -> ApiError {
    match error {
        WebhookEndpointError::InvalidUrl(_) | WebhookEndpointError::NoEventTypes => {
            ApiError::invalid_request(error)
        }
        WebhookEndpointError::LimitReached => {
            ApiError::from(WebhooksRejection::EndpointLimitReached)
        }
        WebhookEndpointError::NotFound => ApiError::NotFound("webhook endpoint"),
        other => ApiError::internal(other),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Clients match on this code: changing it is a breaking change of the API.
    #[test]
    fn the_limit_keeps_its_status_and_code() {
        let rejection = WebhooksRejection::EndpointLimitReached;

        assert_eq!(
            rejection.status_and_code(),
            (StatusCode::CONFLICT, "webhook_endpoint_limit")
        );
    }

    #[test]
    fn invalid_input_is_a_bad_request() {
        let response = endpoint_error_response(WebhookEndpointError::NoEventTypes);

        assert!(matches!(response, ApiError::InvalidRequest(_)));
    }
}
