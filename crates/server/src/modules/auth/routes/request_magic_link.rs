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

/// `POST /magic-link`: emails a one-time login link. An unknown email gets a passwordless
/// account, so the same call signs people up; the answer never reveals which case it was.
#[utoipa::path(
    post,
    path = "/auth/v1/magic-link",
    tag = "auth",
    security(("api_key" = [])),
    request_body = EmailBody,
    responses(
        (status = 202, description = "A login link is on its way"),
        (status = 429, description = "Too many emails requested", body = ErrorBody),
    )
)]
pub async fn request_magic_link(
    State(state): State<AppState>,
    tenant: TenantContext,
    origin: RequestOrigin,
    ValidatedJson(body): ValidatedJson<EmailBody>,
) -> Result<StatusCode, ApiError> {
    ensure_address_allowed(&tenant.pool, origin.client_ip).await?;
    let request = EmailLinkRequest {
        raw_email: &body.email,
        origin,
        kind: AuthEmailKind::MagicLink,
        captcha_token: body.captcha_token.as_deref(),
    };

    request_email_link(state.auth_email_links(), tenant, &request).await?;

    Ok(StatusCode::ACCEPTED)
}
