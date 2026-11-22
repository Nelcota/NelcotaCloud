use axum::http::StatusCode;

use crate::modules::notifications::delivery::alert_dispatch::DispatchError;
use crate::shared::http::api_error::{ApiError, Rejection};

/// Refusals of the notification channels API.
#[derive(Debug, thiserror::Error)]
pub enum NotificationsRejection {
    #[error("a project can have at most 5 notification channels")]
    ChannelLimitReached,
    #[error("the channel did not accept the test alert")]
    TestFailed,
    #[error("alerts need the console (platform tenant) configured")]
    NoConsole,
}

impl NotificationsRejection {
    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::ChannelLimitReached => (StatusCode::CONFLICT, "notification_channel_limit"),
            Self::TestFailed => (StatusCode::BAD_GATEWAY, "notification_test_failed"),
            Self::NoConsole => (StatusCode::SERVICE_UNAVAILABLE, "platform_not_configured"),
        }
    }
}

impl From<NotificationsRejection> for ApiError {
    fn from(rejection: NotificationsRejection) -> Self {
        let (status, code) = rejection.status_and_code();

        Self::Rejected(Rejection {
            status,
            code,
            message: rejection.to_string(),
        })
    }
}

/// A test that reached no channel says why in the log; the client learns which part failed.
pub fn test_error_response(error: DispatchError) -> ApiError {
    match error {
        DispatchError::NoChannel => ApiError::NotFound("notification channel"),
        DispatchError::NoConsole => ApiError::from(NotificationsRejection::NoConsole),
        DispatchError::Delivery(delivery) => {
            tracing::warn!(error = %delivery, "test alert was not delivered");
            ApiError::from(NotificationsRejection::TestFailed)
        }
        other => ApiError::internal(other),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Clients match on these codes: changing one is a breaking change of the API.
    #[test]
    fn refusals_keep_their_status_and_code() {
        assert_eq!(
            NotificationsRejection::ChannelLimitReached.status_and_code(),
            (StatusCode::CONFLICT, "notification_channel_limit")
        );
        assert_eq!(
            NotificationsRejection::TestFailed.status_and_code(),
            (StatusCode::BAD_GATEWAY, "notification_test_failed")
        );
    }
}
