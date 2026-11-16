use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email::{AuthEmailContext, smtp_test_email};
use crate::modules::auth::email::auth_email_template::render_auth_email;
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::modules::tenants::smtp::smtp_settings_repository::find_smtp_settings;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

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
    let Ok(recipient) = EmailAddress::parse(&body.to) else {
        return Err(ApiError::InvalidRequest("invalid email address".to_owned()));
    };
    let stored = find_smtp_settings(&state.control_plane_pool, tenant_id)
        .await
        .map_err(ApiError::internal)?;

    if stored.is_none() {
        return Err(ApiError::Conflict(
            "configure your own SMTP server before sending a test".to_owned(),
        ));
    }

    let attempt = Attempt {
        tenant_id,
        email: recipient.as_str(),
        client_ip,
    };
    state
        .rate_limits
        .email_delivery
        .check(&attempt)
        .map_err(|_| ApiError::RateLimited)?;

    deliver_test(&state, tenant_id, &recipient).await
}

async fn deliver_test(
    state: &AppState,
    tenant_id: Uuid,
    recipient: &EmailAddress,
) -> Result<StatusCode, ApiError> {
    let settings = load_tenant_settings(state, tenant_id).await?;
    let context = AuthEmailContext {
        tenant_name: &settings.name,
        site_url: &settings.site_url,
    };
    let email = render_auth_email(smtp_test_email(&context), recipient.as_str())
        .map_err(ApiError::internal)?;
    let sender = state
        .email_senders
        .sender_for(tenant_id)
        .await
        .map_err(ApiError::internal)?;

    if let Err(error) = sender.send(email).await {
        tracing::warn!(%error, "SMTP test email was not delivered");
        return Err(ApiError::SmtpDeliveryFailed);
    }

    Ok(StatusCode::NO_CONTENT)
}
