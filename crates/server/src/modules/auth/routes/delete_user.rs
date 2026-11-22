use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::user::user_administration::delete_user as delete;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
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
        (status = 409, description = "The account is the last active owner of a project", body = ErrorBody),
    )
)]
pub async fn delete_user(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let webhooks = state.webhooks.recorder(admin.tenant_id).await?;
    let event = NewAuditEvent::by_admin(AuditAction::UserDeleted, user_id, admin.author());
    let deleted = delete(
        &state,
        &admin.pool,
        (admin.tenant_id, user_id),
        None,
        &webhooks,
        event,
    )
    .await?;

    if deleted == false {
        return Err(ApiError::NotFound("user"));
    }

    Ok(StatusCode::NO_CONTENT)
}
