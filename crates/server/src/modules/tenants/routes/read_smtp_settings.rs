use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::smtp::smtp_settings_repository::{
    SmtpSettingsView, StoredSmtpSettings, find_smtp_settings,
};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/smtp`: where the tenant's auth emails are sent from, without credentials.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/smtp",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Current SMTP settings", body = SmtpSettingsView),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_smtp_settings(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<SmtpSettingsView>, ApiError> {
    let stored = find_smtp_settings(&state.control_plane_pool, admin.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let view = stored.map_or_else(SmtpSettingsView::platform_default, StoredSmtpSettings::view);

    Ok(Json(view))
}
