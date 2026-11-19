use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::user::user_administration::delete_user as delete;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/users/{user_id}`: removes the user with their identities and sessions.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/users/{user_id}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 204, description = "User deleted"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn delete_user(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let webhooks = state.webhooks.recorder(admin.tenant_id).await?;
    let deleted = delete(&admin.pool, user_id, &webhooks).await?;

    if deleted == false {
        return Err(ApiError::NotFound("user"));
    }

    state
        .erase_user_storage(admin.tenant_id, (&admin.pool, user_id))
        .await;
    let event = NewAuditEvent::by_admin(AuditAction::UserDeleted, user_id, admin.author());
    record_audit_event(&admin.pool, event).await;

    Ok(StatusCode::NO_CONTENT)
}
