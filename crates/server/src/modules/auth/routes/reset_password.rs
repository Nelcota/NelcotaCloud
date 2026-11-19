use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::password::password_policy::check_new_password;
use crate::modules::auth::password::password_reset::{PasswordReset, redeem_password_reset};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct ResetPasswordBody {
    #[validate(length(min = 1, max = 256))]
    pub token: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

/// `POST /reset-password`: consuming the link, setting the password and ending every session
/// happen in one transaction, so a failure leaves the link usable and nothing half done.
#[utoipa::path(
    post,
    path = "/auth/v1/reset-password",
    tag = "auth",
    security(("api_key" = [])),
    request_body = ResetPasswordBody,
    responses(
        (status = 204, description = "Password changed and every session ended"),
        (status = 400, description = "Invalid or expired token, or weak password", body = ErrorBody),
    )
)]
pub async fn reset_password(
    State(state): State<AppState>,
    tenant: TenantContext,
    origin: RequestOrigin,
    ValidatedJson(body): ValidatedJson<ResetPasswordBody>,
) -> Result<StatusCode, ApiError> {
    let client_ip = origin.client_ip;
    state
        .rate_limits
        .token_redemption
        .check(tenant.tenant_id, client_ip)?;
    check_new_password(&body.password).map_err(ApiError::invalid_request)?;
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let reset = PasswordReset {
        token: &body.token,
        password: body.password,
        origin,
    };

    redeem_password_reset(&tenant.pool, &webhooks, reset).await?;

    Ok(StatusCode::NO_CONTENT)
}
