use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use serde_json::json;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::modules::tenants::settings::tenant_settings::TenantSettings;
use crate::modules::tenants::settings::tenant_settings_update::{
    TenantSettingsUpdate, update_settings,
};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;
use crate::shared::text::single_line::check_single_line;

#[derive(Deserialize, Validate, ToSchema)]
pub struct TenantSettingsBody {
    #[validate(length(min = 1, max = 100), custom(function = check_single_line))]
    pub name: Option<String>,
    #[validate(length(min = 1, max = 2048))]
    pub site_url: Option<String>,
    pub require_email_verification: Option<bool>,
    /// Zero selects the automatic mascot. Omit the field to keep the current setting.
    #[validate(range(min = 0, max = 32))]
    #[schema(minimum = 0, maximum = 32)]
    pub mascot_id: Option<i16>,
}

/// Changes only the fields that are sent for the resolved project.
#[utoipa::path(
    patch,
    path = "/auth/v1/admin/settings",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = TenantSettingsBody,
    responses(
        (status = 200, description = "Updated settings", body = TenantSettings),
        (status = 400, description = "Invalid project settings", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn change_tenant_settings(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(body): ValidatedJson<TenantSettingsBody>,
) -> Result<Json<TenantSettings>, ApiError> {
    let update = TenantSettingsUpdate {
        name: body.name.as_deref(),
        site_url: body.site_url.as_deref(),
        require_email_verification: body.require_email_verification,
        mascot_id: body.mascot_id,
    };
    let fields = changed_fields(&body);
    let pool = &state.control_plane_pool;
    let settings = update_settings(pool, admin.tenant_id, update).await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "project", "fields": fields }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(Json(settings))
}

/// The settings the request touched, by name only: the log says what changed, not to what.
fn changed_fields(body: &TenantSettingsBody) -> Vec<&'static str> {
    let fields = [
        ("name", body.name.is_some()),
        ("site_url", body.site_url.is_some()),
        (
            "require_email_verification",
            body.require_email_verification.is_some(),
        ),
        ("mascot_id", body.mascot_id.is_some()),
    ];

    fields
        .into_iter()
        .filter(|(_, is_present)| *is_present)
        .map(|(field, _)| field)
        .collect()
}
