use axum::http::StatusCode;
use serde::Deserialize;
use validator::Validate;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::password::password_hashing::hash_password;
use crate::modules::auth::password::password_policy::check_new_password;
use crate::modules::auth::session::refresh_token_repository::revoke_all_user_refresh_tokens;
use crate::modules::auth::user::user_account_updates::set_password;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

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
    // Checked before the token is consumed, so a rejected password does not burn the link.
    check_new_password(&body.password).map_err(ApiError::invalid_request)?;
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
