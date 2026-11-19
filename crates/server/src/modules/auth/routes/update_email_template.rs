use axum::Json;
use axum::extract::{Path, State};
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::auth::email::auth_email_dispatch::AuthEmailKind;
use crate::modules::auth::email::email_template_repository::{TemplateKey, save_email_template};
use crate::modules::auth::email::email_template_text::EmailTemplateText;
use crate::modules::auth::email::email_template_view::{EmailTemplateView, email_template_view};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `PUT /admin/email-templates/{kind}`: the project's own wording for one email. Plain text;
/// `{app_name}` is replaced by the project's name.
#[utoipa::path(
    put,
    path = "/auth/v1/admin/email-templates/{kind}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("kind" = AuthEmailKind, Path, description = "Which email")),
    request_body = EmailTemplateText,
    responses(
        (status = 200, description = "The saved wording", body = EmailTemplateView),
        (status = 400, description = "Blank, too long, or a line break in a one-line field", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn update_email_template(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(kind): Path<AuthEmailKind>,
    ValidatedJson(text): ValidatedJson<EmailTemplateText>,
) -> Result<Json<EmailTemplateView>, ApiError> {
    let pool = &state.control_plane_pool;
    let key = TemplateKey {
        tenant_id: admin.tenant_id,
        kind,
    };
    save_email_template(pool, key, &text).await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "email_template", "template": kind }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(Json(email_template_view(pool, key).await?))
}
