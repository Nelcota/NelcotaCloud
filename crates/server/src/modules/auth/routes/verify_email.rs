use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::auth::email::email_verification::redeem_email_verification;
use crate::modules::auth::routes::one_time_token_body::OneTimeTokenBody;
use crate::modules::auth::user::user_response::UserResponse;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /verify-email`: consuming the link and marking the email verified are one transaction.
#[utoipa::path(
    post,
    path = "/auth/v1/verify-email",
    tag = "auth",
    security(("api_key" = [])),
    request_body = OneTimeTokenBody,
    responses(
        (status = 200, description = "Email verified", body = UserResponse),
        (status = 400, description = "Invalid or expired token", body = ErrorBody),
    )
)]
pub async fn verify_email(
    State(state): State<AppState>,
    tenant: TenantContext,
    origin: RequestOrigin,
    ValidatedJson(body): ValidatedJson<OneTimeTokenBody>,
) -> Result<Json<UserResponse>, ApiError> {
    let client_ip = origin.client_ip;
    state
        .rate_limits
        .auth
        .check_redemption(tenant.tenant_id, client_ip)
        .await?;
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let user = redeem_email_verification(&tenant.pool, &webhooks, (&body.token, origin)).await?;

    Ok(Json(user.into()))
}
