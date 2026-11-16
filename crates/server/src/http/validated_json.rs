use axum::Json;
use axum::extract::{FromRequest, Request};
use serde::de::DeserializeOwned;
use validator::Validate;

use crate::http::api_error::ApiError;

/// JSON body that is deserialized and then validated; any failure becomes a 400 `ApiError`.
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
            .map_err(|rejection| ApiError::InvalidRequest(rejection.body_text()))?;
        body.validate().map_err(ApiError::invalid_request)?;

        Ok(Self(body))
    }
}
