use crate::shared::http::api_error::ErrorBody;
use axum::Json;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::user::user_account_updates::mark_email_verified;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct OneTimeTokenBody {
    #[validate(length(min = 1, max = 256))]
    pub token: String,
}

/// `POST /verify-email`: consuming the link and marking the email verified are one transaction.
#[utoipa::path(
    post,
    path = "/auth/v1/verify-email",
    tag = "auth",
    security(("api_key" = [])),
    request_body = OneTimeTokenBody,
    responses(
        (status = 200, description = "Email verified", body = User),
        (status = 400, description = "Invalid or expired token", body = ErrorBody),
    )
)]
pub async fn verify_email(
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<OneTimeTokenBody>,
) -> Result<Json<User>, ApiError> {
    let mut transaction = tenant.pool.begin().await.map_err(ApiError::internal)?;
    let purpose = OneTimeTokenPurpose::EmailVerification;
    let consumed = consume_one_time_token(&mut transaction, purpose, &body.token)
        .await
        .map_err(ApiError::internal)?;
    let Some(consumed) = consumed else {
        return Err(ApiError::InvalidToken);
    };
    let user = mark_email_verified(&mut transaction, consumed.user_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Err(ApiError::InvalidToken);
    };
    transaction.commit().await.map_err(ApiError::internal)?;

    Ok(Json(user))
}
