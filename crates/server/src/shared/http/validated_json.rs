use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{FromRequest, Request};
use axum::http::StatusCode;
use serde::de::DeserializeOwned;
use validator::Validate;

use crate::shared::http::api_error::ApiError;

/// JSON body that is deserialized and then validated. Invalid content is a 400; a missing JSON
/// content type (415) and an oversized body (413) keep their own status.
pub struct ValidatedJson<T>(pub T);

impl<T, S> FromRequest<S> for ValidatedJson<T>
where
    T: DeserializeOwned + Validate,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request(request: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Json(body) = Json::<T>::from_request(request, state)
            .await
            .map_err(|rejection| map_rejection(&rejection))?;
        body.validate().map_err(ApiError::invalid_request)?;

        Ok(Self(body))
    }
}

pub(crate) fn map_rejection(rejection: &JsonRejection) -> ApiError {
    match rejection.status() {
        StatusCode::UNSUPPORTED_MEDIA_TYPE => ApiError::UnsupportedMediaType,
        StatusCode::PAYLOAD_TOO_LARGE => ApiError::PayloadTooLarge,
        _ => ApiError::InvalidRequest(rejection.body_text()),
    }
}
