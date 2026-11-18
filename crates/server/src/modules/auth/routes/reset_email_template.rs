use axum::Json;
use axum::extract::{Path, State};

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;
use crate::modules::auth::email::email_template_repository::{TemplateKey, delete_email_template};
use crate::modules::auth::email::email_template_view::{EmailTemplateView, email_template_view};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/email-templates/{kind}`: back to the platform's wording for one email.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/email-templates/{kind}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("kind" = AuthEmailKind, Path, description = "Which email")),
    responses(
        (status = 200, description = "The default wording, now in use", body = EmailTemplateView),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn reset_email_template(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(kind): Path<AuthEmailKind>,
) -> Result<Json<EmailTemplateView>, ApiError> {
    let pool = &state.control_plane_pool;
    let key = TemplateKey {
        tenant_id: admin.tenant_id,
        kind,
    };
    delete_email_template(pool, key).await?;

    Ok(Json(email_template_view(pool, key).await?))
}
