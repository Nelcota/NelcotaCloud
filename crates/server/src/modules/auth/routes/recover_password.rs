use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;
use crate::modules::auth::email::auth_email_request::{
    EmailBody, EmailLinkRequest, request_email_link,
};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::ip_blocks::address_guard::ensure_address_allowed;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /recover`: emails a password reset link.
#[utoipa::path(
    post,
    path = "/auth/v1/recover",
    tag = "auth",
    security(("api_key" = [])),
    request_body = EmailBody,
    responses(
        (status = 202, description = "A reset link is sent if the email has an account"),
        (status = 429, description = "Too many emails requested", body = ErrorBody),
    )
)]
pub async fn recover_password(
    State(state): State<AppState>,
    tenant: TenantContext,
    origin: RequestOrigin,
    ValidatedJson(body): ValidatedJson<EmailBody>,
) -> Result<StatusCode, ApiError> {
    ensure_address_allowed(&tenant.pool, origin.client_ip).await?;
    let request = EmailLinkRequest {
        raw_email: &body.email,
        origin,
        kind: AuthEmailKind::PasswordReset,
        captcha_token: body.captcha_token.as_deref(),
    };

    request_email_link(state.auth_email_links(), tenant, &request).await?;

    Ok(StatusCode::ACCEPTED)
}
