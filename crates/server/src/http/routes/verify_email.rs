use axum::Json;
use serde::Deserialize;
use validator::Validate;

use crate::auth::one_time_token_repository::{OneTimeTokenPurpose, consume_one_time_token};
use crate::auth::user_repository::User;
use crate::auth::user_updates::mark_email_verified;
use crate::http::api_error::ApiError;
use crate::http::tenant_context::TenantContext;
use crate::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct OneTimeTokenBody {
    #[validate(length(min = 1, max = 256))]
    pub token: String,
}

pub async fn verify_email(
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<OneTimeTokenBody>,
) -> Result<Json<User>, ApiError> {
    let purpose = OneTimeTokenPurpose::EmailVerification;
    let user_id = consume_one_time_token(&tenant.pool, purpose, &body.token)
        .await
        .map_err(ApiError::internal)?;
    let Some(user_id) = user_id else {
        return Err(ApiError::InvalidToken);
    };
    let user = mark_email_verified(&tenant.pool, user_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Err(ApiError::InvalidToken);
    };

    Ok(Json(user))
}
