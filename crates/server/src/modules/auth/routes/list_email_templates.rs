use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::auth::email::email_template_view::{EmailTemplateView, email_template_views};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/email-templates`: the wording of each auth email, the project's or the default.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/email-templates",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Every auth email", body = Vec<EmailTemplateView>),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_email_templates(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<Vec<EmailTemplateView>>, ApiError> {
    let pool = &state.control_plane_pool;

    Ok(Json(email_template_views(pool, admin.tenant_id).await?))
}
