use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;
use crate::modules::auth::email::auth_email_request::{
    EmailBody, EmailLinkRequest, request_email_link,
};
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
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
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<EmailBody>,
) -> Result<StatusCode, ApiError> {
    let request = EmailLinkRequest {
        raw_email: &body.email,
        client_ip,
        kind: AuthEmailKind::MagicLink,
    };

    request_email_link(&state, tenant, &request)
}
