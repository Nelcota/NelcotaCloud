use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::captcha::captcha_settings_repository::delete_captcha_settings;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/captcha`: logins and signups no longer need a captcha.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/captcha",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 204, description = "Captcha no longer required"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn remove_captcha(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<StatusCode, ApiError> {
    delete_captcha_settings(&state.control_plane_pool, admin.tenant_id).await?;

    Ok(StatusCode::NO_CONTENT)
}
