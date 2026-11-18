use axum::Json;
use axum::extract::{Path, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::audit::audit_action::AuditAction;
use crate::modules::auth::audit::audit_event::NewAuditEvent;
use crate::modules::auth::audit::audit_recorder::record_audit_event;
use crate::modules::auth::user::status_change::StatusChange;
use crate::modules::auth::user::user_administration::unban_user as unban;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /admin/users/{user_id}/unban`: the user can log in again.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/users/{user_id}/unban",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 200, description = "User unbanned", body = User),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn unban_user(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<Json<User>, ApiError> {
    let webhooks = state.webhooks.recorder(admin.tenant_id).await?;
    let change = unban(&admin.pool, user_id, &webhooks).await?;
    let user = match change {
        None => return Err(ApiError::NotFound("user")),
        Some(StatusChange::Unchanged(user)) => return Ok(Json(user)),
        Some(StatusChange::Changed(user)) => user,
    };

    let event = NewAuditEvent::by_admin(AuditAction::UserUnbanned, user_id, admin.actor);
    record_audit_event(&admin.pool, event).await;

    Ok(Json(user))
}
