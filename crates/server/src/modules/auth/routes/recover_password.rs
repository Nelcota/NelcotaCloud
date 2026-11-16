use crate::shared::http::api_error::ErrorBody;
use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;
use crate::modules::auth::email::auth_email_request::{
    EmailBody, EmailLinkRequest, request_email_link,
};
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;
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
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<EmailBody>,
) -> Result<StatusCode, ApiError> {
    let request = EmailLinkRequest {
        raw_email: &body.email,
        client_ip,
        kind: AuthEmailKind::PasswordReset,
    };

    request_email_link(&state, tenant, &request)
}
