use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::user::user_administration::delete_user;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;

/// `DELETE /user`: the logged-in user deletes their own account and all its data (the right
/// to erasure). Their access token stops working once it no longer matches a user.
#[utoipa::path(
    delete,
    path = "/auth/v1/user",
    tag = "auth",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 204, description = "Account deleted"),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
        (status = 409, description = "The account is the last active owner of a project", body = ErrorBody),
    )
)]
pub async fn delete_own_account(
    State(state): State<AppState>,
    authenticated: AuthenticatedUser,
    origin: RequestOrigin,
) -> Result<StatusCode, ApiError> {
    let tenant = &authenticated.tenant;
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let user_id = authenticated.claims.sub;
    let event = NewAuditEvent::by_user(AuditAction::UserDeleted, user_id, origin);
    let deleted = delete_user(
        &state,
        &tenant.pool,
        (tenant.tenant_id, user_id),
        Some(authenticated.claims.sid),
        &webhooks,
        event,
    )
    .await?;

    if deleted == false {
        return Err(ApiError::from(TenantsRejection::InvalidAccessToken));
    }

    state
        .erase_user_storage(tenant.tenant_id, (&tenant.pool, user_id))
        .await;

    Ok(StatusCode::NO_CONTENT)
}
