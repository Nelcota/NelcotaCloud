use axum::Json;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::routes::one_time_token_body::OneTimeTokenBody;
use crate::modules::auth::user::user_account_updates::mark_email_verified;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

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
    let mut transaction = tenant.pool.begin().await?;
    let purpose = OneTimeTokenPurpose::EmailVerification;
    let consumed = consume_one_time_token(&mut transaction, purpose, &body.token).await?;
    let Some(consumed) = consumed else {
        return Err(ApiError::from(AuthRejection::InvalidToken));
    };
    let user = mark_email_verified(&mut transaction, consumed.user_id).await?;
    let Some(user) = user else {
        return Err(ApiError::from(AuthRejection::InvalidToken));
    };
    transaction.commit().await?;

    Ok(Json(user))
}
