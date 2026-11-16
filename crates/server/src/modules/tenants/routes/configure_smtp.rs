use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::smtp::smtp_endpoint::SmtpEndpoint;
use crate::modules::tenants::smtp::smtp_settings_repository::{
    NewSmtpSettings, SmtpSettingsView, find_smtp_settings, save_smtp_settings, smtp_url_context,
};
use crate::shared::email::email_sender::EmailSender;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct SmtpSettingsBody {
    /// `smtps://user:password@host:465` (implicit TLS) or `smtp://user:password@host:587`.
    #[validate(length(min = 1, max = 2048))]
    pub smtp_url: String,
    /// The sender, e.g. `Acme <no-reply@acme.com>`.
    #[validate(length(min = 3, max = 320))]
    pub email_from: String,
}

/// `PUT /admin/smtp`: auth emails of the tenant go through its own SMTP server.
///
/// The server must be on a public host and an SMTP port, so the API cannot be used to reach
/// services inside its own network.
#[utoipa::path(
    put,
    path = "/auth/v1/admin/smtp",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = SmtpSettingsBody,
    responses(
        (status = 200, description = "SMTP settings saved", body = SmtpSettingsView),
        (status = 400, description = "Invalid URL or sender, or a private host or port", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn configure_smtp(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(body): ValidatedJson<SmtpSettingsBody>,
) -> Result<Json<SmtpSettingsView>, ApiError> {
    let tenant_id = admin.tenant_id;
    let smtp_url = body.smtp_url.trim();
    let email_from = body.email_from.trim();
    let endpoint = SmtpEndpoint::parse(smtp_url).map_err(ApiError::invalid_request)?;
    let senders = &state.email_senders;
    senders
        .check_endpoint(&endpoint)
        .await
        .map_err(ApiError::invalid_request)?;
    EmailSender::new(smtp_url, email_from).map_err(ApiError::invalid_request)?;
    let smtp_url_ciphertext = state
        .secret_box
        .seal(smtp_url.as_bytes(), &smtp_url_context(tenant_id))
        .map_err(ApiError::internal)?;
    let settings = NewSmtpSettings {
        tenant_id,
        endpoint: &endpoint,
        smtp_url_ciphertext: &smtp_url_ciphertext,
        email_from,
    };
    let pool = &state.control_plane_pool;
    save_smtp_settings(pool, settings)
        .await
        .map_err(ApiError::internal)?;
    senders.forget(tenant_id).await;
    let stored = find_smtp_settings(pool, tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(stored) = stored else {
        return Err(ApiError::internal("saved SMTP settings are missing"));
    };

    Ok(Json(stored.view()))
}
