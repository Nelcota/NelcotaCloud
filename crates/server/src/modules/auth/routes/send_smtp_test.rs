use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::email::smtp_test_delivery::deliver_smtp_test;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::smtp::smtp_settings_repository::find_smtp_settings;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;
use crate::shared::http::validated_json::ValidatedJson;
use crate::shared::rate_limiting::attempt_limiter::Attempt;

#[derive(Deserialize, Validate, ToSchema)]
pub struct SmtpTestBody {
    /// Where the test email goes.
    #[validate(length(min = 1, max = 254))]
    pub to: String,
}

/// `POST /admin/smtp/test`: sends a test email through the tenant's own SMTP server.
///
/// Waits for the server to accept the message, so the owner sees a delivery problem right
/// away. Only for a configured server: the platform's server is not offered as a free relay.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/smtp/test",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = SmtpTestBody,
    responses(
        (status = 204, description = "The SMTP server accepted the test email"),
        (status = 400, description = "Invalid recipient", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 409, description = "The project uses the platform's SMTP server", body = ErrorBody),
        (status = 429, description = "Too many test emails", body = ErrorBody),
        (status = 502, description = "The SMTP server refused or could not be reached", body = ErrorBody),
    )
)]
pub async fn send_smtp_test(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<SmtpTestBody>,
) -> Result<StatusCode, ApiError> {
    let tenant_id = admin.tenant_id;
    let recipient = EmailAddress::parse(&body.to)
        .map_err(|_| ApiError::InvalidRequest("invalid email address".to_owned()))?;
    require_own_smtp(&state, tenant_id).await?;
    let attempt = Attempt {
        tenant_id,
        email: recipient.as_str(),
        client_ip,
    };
    state.rate_limits.auth.check_email(&attempt).await?;

    deliver_smtp_test(&state.auth_mailer(), tenant_id, &recipient).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// The platform's server is not the tenant's to test.
async fn require_own_smtp(state: &AppState, tenant_id: Uuid) -> Result<(), ApiError> {
    let stored = find_smtp_settings(&state.control_plane_pool, tenant_id).await?;

    if stored.is_none() {
        return Err(ApiError::Conflict(
            "configure your own SMTP server before sending a test".to_owned(),
        ));
    }

    Ok(())
}
