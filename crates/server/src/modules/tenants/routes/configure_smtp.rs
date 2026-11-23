use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use serde_json::json;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_audit_queue::{
    begin_project_change, commit_project_change,
};
use crate::modules::tenants::audit::project_change::ProjectChange;
use crate::modules::tenants::smtp::smtp_settings_change::{
    SmtpSettingsChange, SmtpSettingsChangeError,
};
use crate::modules::tenants::smtp::smtp_settings_view::SmtpSettingsView;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct SmtpSettingsBody {
    /// `smtps://user:password@host:465` or `smtp://user:password@host:587?tls=required`.
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
    let change = SmtpSettingsChange {
        tenant_id: admin.tenant_id,
        smtp_url: body.smtp_url.trim(),
        email_from: body.email_from.trim(),
    };
    let prepared = state
        .smtp_settings_store()
        .prepare(change)
        .await
        .map_err(map_change_error)?;
    let mut transaction = begin_project_change(&state.control_plane_pool, admin.tenant_id).await?;
    let saved = prepared
        .save(&mut transaction)
        .await
        .map_err(map_change_error)?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "smtp" }),
    };
    commit_project_change(&state, transaction, change).await?;

    Ok(Json(saved))
}

fn map_change_error(error: SmtpSettingsChangeError) -> ApiError {
    if error.is_invalid_input() {
        return ApiError::invalid_request(error);
    }

    ApiError::internal(error)
}
