use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::user::user_administration::end_sessions_of_user;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /admin/users/{user_id}/logout`: ends every session in Auth.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/users/{user_id}/logout",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 204, description = "Every session ended"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn end_user_sessions(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let webhooks = state.webhooks.recorder(admin.tenant_id).await?;
    let event = NewAuditEvent::by_admin(AuditAction::SessionsRevoked, user_id, admin.author());
    let found = end_sessions_of_user(&admin.pool, user_id, &webhooks, event).await?;

    if found == false {
        return Err(ApiError::NotFound("user"));
    }

    Ok(StatusCode::NO_CONTENT)
}
