use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::mfa::admin_mfa_reset::reset_factor_as_admin;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/users/{user_id}/mfa`: removes the user's authenticator (e.g. a lost phone),
/// after the tenant confirmed who they are by its own means.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/users/{user_id}/mfa",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 204, description = "Authenticator removed"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "The user has no authenticator", body = ErrorBody),
    )
)]
pub async fn reset_user_mfa(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let webhooks = state.webhooks.recorder(admin.tenant_id).await?;
    let deleted = reset_factor_as_admin(&admin.pool, &webhooks, (user_id, admin.author())).await?;

    if deleted == false {
        return Err(ApiError::NotFound("authenticator"));
    }

    Ok(StatusCode::NO_CONTENT)
}
