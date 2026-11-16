use axum::http::StatusCode;
use serde::Deserialize;
use validator::Validate;

use crate::auth::one_time_token_repository::{OneTimeTokenPurpose, consume_one_time_token};
use crate::auth::password_hashing::hash_password;
use crate::auth::refresh_token_repository::revoke_all_user_refresh_tokens;
use crate::auth::user_updates::set_password;
use crate::http::api_error::ApiError;
use crate::http::tenant_context::TenantContext;
use crate::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct ResetPasswordBody {
    #[validate(length(min = 1, max = 256))]
    pub token: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

/// Sets the new password and ends every existing session of the user.
pub async fn reset_password(
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<ResetPasswordBody>,
) -> Result<StatusCode, ApiError> {
    let purpose = OneTimeTokenPurpose::PasswordReset;
    let user_id = consume_one_time_token(&tenant.pool, purpose, &body.token)
        .await
        .map_err(ApiError::internal)?;
    let Some(user_id) = user_id else {
        return Err(ApiError::InvalidToken);
    };
    let password_hash = hash_password(body.password)
        .await
        .map_err(ApiError::internal)?;
    set_password(&tenant.pool, user_id, &password_hash)
        .await
        .map_err(ApiError::internal)?;
    revoke_all_user_refresh_tokens(&tenant.pool, user_id)
        .await
        .map_err(ApiError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}
